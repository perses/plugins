// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { PanelData } from '@perses-dev/plugin-system';
import type { TimeSeries, TimeSeriesData } from '@perses-dev/spec';

import { DEFAULT_NODE_WIDTH } from '../components/shared/NodeRenderer';
import type { EdgeSpec, GraphGenerationSpec, NodeSpec } from '../model';

export interface GeneratedGraph {
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  /** Series backing each generated node/edge id, used to resolve color/label/thickness at render time. */
  seriesByItemId: Map<string, TimeSeries>;
  /**
   * Series backing the reverse half of a reciprocal generated edge, keyed by edge id. Present only
   * for edges where the query returned both A→B and B→A; the forward half uses `seriesByItemId`.
   */
  reverseSeriesByItemId: Map<string, TimeSeries>;
  /** Stable key describing the graph topology (node + edge ids), for memoizing layout. */
  topologyKey: string;
}

const NODE_ID_PREFIX = 'gen-node:';
const EDGE_ID_PREFIX = 'gen-edge:';

function nodeId(labelValue: string): string {
  return `${NODE_ID_PREFIX}${labelValue}`;
}

/**
 * Builds nodes and edges from query results by grouping series on their labels. Node series are
 * grouped by `nodeIdLabel`; edge series are grouped by `edgeSourceLabel`/`edgeTargetLabel` and are
 * dropped when either endpoint is not a known node. Each generated item keeps the series it was
 * derived from so the existing threshold/label/thickness pipeline can resolve its visuals.
 */
export function buildGraphFromQueries(
  config: GraphGenerationSpec,
  queryResults: Array<PanelData<TimeSeriesData>>,
  nodeDefaultSize?: number,
): GeneratedGraph {
  const seriesByItemId = new Map<string, TimeSeries>();
  const reverseSeriesByItemId = new Map<string, TimeSeries>();
  const nodes: NodeSpec[] = [];
  const nodeIds = new Set<string>();
  const nodeSize = nodeDefaultSize && nodeDefaultSize > 0 ? nodeDefaultSize : DEFAULT_NODE_WIDTH;

  const nodeResult = queryResults[config.nodeQueryIndex];
  const nodeSeries = nodeResult?.data.series ?? [];
  for (const series of nodeSeries) {
    const labelValue = series.labels?.[config.nodeIdLabel];
    if (labelValue === undefined || labelValue === '') {
      continue;
    }
    const id = nodeId(labelValue);
    if (nodeIds.has(id)) {
      // Keep the first series for a given node id; later duplicates are ignored for determinism.
      continue;
    }
    nodeIds.add(id);
    seriesByItemId.set(id, series);
    nodes.push({
      id,
      position: { x: 0, y: 0 }, // filled in by layoutGraph
      width: nodeSize,
      height: nodeSize,
      kind: 'icon',
      label: config.nodeLabelTemplate ?? `{{${config.nodeIdLabel}}}`,
      labelPosition: 'below',
      colorMode: 'threshold',
      // Drive size from the node-size thresholds so generated nodes grow/shrink with their value;
      // with no nodeThresholdSizes configured this is a no-op (scale 1).
      sizeMode: 'threshold',
    });
  }

  const edges: EdgeSpec[] = [];
  const canBuildEdges =
    config.edgeQueryIndex !== undefined && config.edgeSourceLabel !== undefined && config.edgeTargetLabel !== undefined;

  if (canBuildEdges) {
    const edgeResult = queryResults[config.edgeQueryIndex!];
    const edgeSeries = edgeResult?.data.series ?? [];

    // Group directed series by their unordered node pair so reciprocal rows (A→B and B→A) become a
    // single bidirectional edge. Each entry keeps the orientation of the first-seen series (its
    // `source`/`target`) plus the series for each observed direction. Building edges once per pair
    // avoids two generated edges overpainting the same path and overlapping their labels.
    interface PairEntry {
      source: string;
      target: string;
      sourceValue: string;
      targetValue: string;
      forward?: TimeSeries;
      reverse?: TimeSeries;
    }
    const pairs = new Map<string, PairEntry>();
    const pairOrder: string[] = [];

    for (const series of edgeSeries) {
      const sourceValue = series.labels?.[config.edgeSourceLabel!];
      const targetValue = series.labels?.[config.edgeTargetLabel!];
      if (sourceValue === undefined || targetValue === undefined) {
        continue;
      }
      const source = nodeId(sourceValue);
      const target = nodeId(targetValue);
      if (!nodeIds.has(source) || !nodeIds.has(target)) {
        // Drop edges whose endpoints were not produced by the node query.
        continue;
      }
      // Unordered pair key so A→B and B→A map to the same entry. JSON.stringify of the sorted tuple
      // escapes the values so distinct pairs never collide (e.g. (`a->b`, `c`) vs (`a`, `b->c`)).
      const pairKey = JSON.stringify([sourceValue, targetValue].toSorted());
      let entry = pairs.get(pairKey);
      if (!entry) {
        entry = { source, target, sourceValue, targetValue };
        pairs.set(pairKey, entry);
        pairOrder.push(pairKey);
      }
      // Record the series for this direction relative to the entry's orientation. A repeated series
      // in the same direction keeps the first one for determinism.
      if (source === entry.source && target === entry.target) {
        entry.forward ??= series;
      } else {
        entry.reverse ??= series;
      }
    }

    for (const pairKey of pairOrder) {
      const entry = pairs.get(pairKey)!;
      const isReciprocal = entry.forward !== undefined && entry.reverse !== undefined;
      // Derive the id from the canonical (order-independent) pair key, not the entry's first-seen
      // orientation. Otherwise reordering reciprocal A→B / B→A rows would flip the id and thus the
      // topologyKey, forcing CanvasPanel to rerun the whole force simulation on an order-only
      // refresh. Orientation is still carried by entry.source/target for the directional series.
      const id = `${EDGE_ID_PREFIX}${pairKey}`;
      const forwardSeries = entry.forward ?? entry.reverse;
      if (forwardSeries) {
        seriesByItemId.set(id, forwardSeries);
      }
      if (isReciprocal) {
        reverseSeriesByItemId.set(id, entry.reverse!);
      }
      edges.push({
        id,
        source: entry.source,
        target: entry.target,
        // A reciprocal pair is always rendered bidirectionally so each direction shows on its own
        // half; a single-direction edge honors the configured flag.
        bidirectional: isReciprocal || (config.bidirectional ?? false),
        sourceLabelTemplate: config.edgeLabelTemplate,
        // Apply the single generation label template to both directions so a bidirectional edge
        // shows the same caption on its forward and reverse halves instead of the reverse half
        // falling back to the default `{{value}}`.
        targetLabelTemplate: config.edgeLabelTemplate,
        // Drive thickness from the edge-thickness thresholds so generated edges vary in width with
        // their value; without this they would all fall back to the fixed default width.
        thicknessMode: 'threshold',
      });
    }
  }

  // Serialize sorted id arrays via JSON so the key is unambiguous (no separator collision between,
  // e.g., ids `a`,`b` and a single id `a,gen-node:b`) and independent of series order, so merely
  // reordering the same series does not change the topology and rerun the layout.
  const topologyKey = JSON.stringify({
    nodes: nodes.map((n) => n.id).toSorted(),
    edges: edges.map((e) => e.id).toSorted(),
  });

  return { nodes, edges, seriesByItemId, reverseSeriesByItemId, topologyKey };
}
