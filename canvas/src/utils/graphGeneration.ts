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
  const edgeIds = new Set<string>();
  const canBuildEdges =
    config.edgeQueryIndex !== undefined && config.edgeSourceLabel !== undefined && config.edgeTargetLabel !== undefined;

  if (canBuildEdges) {
    const edgeResult = queryResults[config.edgeQueryIndex!];
    const edgeSeries = edgeResult?.data.series ?? [];
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
      const id = `${EDGE_ID_PREFIX}${sourceValue}->${targetValue}`;
      if (edgeIds.has(id)) {
        continue;
      }
      edgeIds.add(id);
      seriesByItemId.set(id, series);
      edges.push({
        id,
        source,
        target,
        bidirectional: config.bidirectional ?? false,
        sourceLabelTemplate: config.edgeLabelTemplate,
        // Drive thickness from the edge-thickness thresholds so generated edges vary in width with
        // their value; without this they would all fall back to the fixed default width.
        thicknessMode: 'threshold',
      });
    }
  }

  const topologyKey = [nodes.map((n) => n.id).join(','), edges.map((e) => e.id).join(',')].join('|');

  return { nodes, edges, seriesByItemId, topologyKey };
}
