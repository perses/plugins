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

import type { GraphGenerationSpec } from '../model';
import { buildGraphFromQueries } from './graphGeneration';

function series(labels: Record<string, string>, lastValue: number): TimeSeries {
  return { labels, values: [[0, lastValue]] } as unknown as TimeSeries;
}

function result(...s: TimeSeries[]): PanelData<TimeSeriesData> {
  return { data: { series: s } } as unknown as PanelData<TimeSeriesData>;
}

const baseConfig: GraphGenerationSpec = {
  enabled: true,
  nodeQueryIndex: 0,
  nodeIdLabel: 'instance',
  edgeQueryIndex: 1,
  edgeSourceLabel: 'source',
  edgeTargetLabel: 'target',
};

describe('buildGraphFromQueries', () => {
  it('creates one node per distinct node-id label value', () => {
    const results = [result(series({ instance: 'a' }, 1), series({ instance: 'b' }, 2)), result()];
    const graph = buildGraphFromQueries(baseConfig, results);
    expect(graph.nodes.map((n) => n.id)).toEqual(['gen-node:a', 'gen-node:b']);
    expect(graph.nodes[0]?.colorMode).toBe('threshold');
    expect(graph.nodes[0]?.label).toBe('{{instance}}');
  });

  it('deduplicates repeated node-id values, keeping the first series', () => {
    const results = [result(series({ instance: 'a' }, 1), series({ instance: 'a' }, 99)), result()];
    const graph = buildGraphFromQueries(baseConfig, results);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.seriesByItemId.get('gen-node:a')?.values[0]?.[1]).toBe(1);
  });

  it('skips node series missing the id label', () => {
    const results = [result(series({ other: 'x' }, 1), series({ instance: 'a' }, 2)), result()];
    const graph = buildGraphFromQueries(baseConfig, results);
    expect(graph.nodes.map((n) => n.id)).toEqual(['gen-node:a']);
  });

  it('builds edges referencing generated node ids', () => {
    const results = [
      result(series({ instance: 'a' }, 1), series({ instance: 'b' }, 2)),
      result(series({ source: 'a', target: 'b' }, 5)),
    ];
    const graph = buildGraphFromQueries(baseConfig, results);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ source: 'gen-node:a', target: 'gen-node:b' });
    expect(graph.seriesByItemId.get(graph.edges[0]!.id)?.values[0]?.[1]).toBe(5);
  });

  it('drops edges whose endpoints are not known nodes', () => {
    const results = [
      result(series({ instance: 'a' }, 1)),
      result(series({ source: 'a', target: 'ghost' }, 5), series({ source: 'nope', target: 'a' }, 6)),
    ];
    const graph = buildGraphFromQueries(baseConfig, results);
    expect(graph.edges).toHaveLength(0);
  });

  it('carries the edge label template and bidirectional flag', () => {
    const config: GraphGenerationSpec = { ...baseConfig, edgeLabelTemplate: '{{value}}', bidirectional: true };
    const results = [
      result(series({ instance: 'a' }, 1), series({ instance: 'b' }, 2)),
      result(series({ source: 'a', target: 'b' }, 5)),
    ];
    const graph = buildGraphFromQueries(config, results);
    expect(graph.edges[0]?.sourceLabelTemplate).toBe('{{value}}');
    // Both directional templates come from the single generation setting so a bidirectional edge
    // shows the same caption on each half instead of the reverse defaulting to `{{value}}`.
    expect(graph.edges[0]?.targetLabelTemplate).toBe('{{value}}');
    expect(graph.edges[0]?.bidirectional).toBe(true);
  });

  it('gives distinct ids to endpoint pairs that share a separator-joined form', () => {
    // (`a->b`, `c`) and (`a`, `b->c`) both flatten to `a->b->c` under a naive join; distinct ids
    // keep the second edge from being deduplicated away.
    const results = [
      result(
        series({ instance: 'a->b' }, 1),
        series({ instance: 'c' }, 2),
        series({ instance: 'a' }, 3),
        series({ instance: 'b->c' }, 4),
      ),
      result(series({ source: 'a->b', target: 'c' }, 5), series({ source: 'a', target: 'b->c' }, 6)),
    ];
    const graph = buildGraphFromQueries(baseConfig, results);
    expect(graph.edges).toHaveLength(2);
    expect(new Set(graph.edges.map((e) => e.id)).size).toBe(2);
  });

  it('drives generated edge thickness from the edge-thickness thresholds', () => {
    const results = [
      result(series({ instance: 'a' }, 1), series({ instance: 'b' }, 2)),
      result(series({ source: 'a', target: 'b' }, 5)),
    ];
    const graph = buildGraphFromQueries(baseConfig, results);
    expect(graph.edges[0]?.thicknessMode).toBe('threshold');
    expect(graph.nodes[0]?.sizeMode).toBe('threshold');
  });

  it('uses the configured default node size, falling back to 48', () => {
    const results = [result(series({ instance: 'a' }, 1)), result()];
    expect(buildGraphFromQueries(baseConfig, results).nodes[0]).toMatchObject({ width: 48, height: 48 });
    const sized = buildGraphFromQueries(baseConfig, results, 60);
    expect(sized.nodes[0]).toMatchObject({ width: 60, height: 60 });
  });

  it('respects a custom node label template', () => {
    const config: GraphGenerationSpec = { ...baseConfig, nodeLabelTemplate: '{{instance}}: {{value}}' };
    const results = [result(series({ instance: 'a' }, 1)), result()];
    const graph = buildGraphFromQueries(config, results);
    expect(graph.nodes[0]?.label).toBe('{{instance}}: {{value}}');
  });

  it('produces a nodes-only graph when no edge query is configured', () => {
    const config: GraphGenerationSpec = { enabled: true, nodeQueryIndex: 0, nodeIdLabel: 'instance' };
    const results = [result(series({ instance: 'a' }, 1), series({ instance: 'b' }, 2))];
    const graph = buildGraphFromQueries(config, results);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(0);
  });

  it('builds a topology key that changes with topology but not with values', () => {
    const r1 = [
      result(series({ instance: 'a' }, 1), series({ instance: 'b' }, 2)),
      result(series({ source: 'a', target: 'b' }, 5)),
    ];
    const r2 = [
      result(series({ instance: 'a' }, 100), series({ instance: 'b' }, 200)),
      result(series({ source: 'a', target: 'b' }, 500)),
    ];
    const r3 = [result(series({ instance: 'a' }, 1)), result()];
    const key1 = buildGraphFromQueries(baseConfig, r1).topologyKey;
    const key2 = buildGraphFromQueries(baseConfig, r2).topologyKey;
    const key3 = buildGraphFromQueries(baseConfig, r3).topologyKey;
    expect(key1).toBe(key2); // only values changed
    expect(key1).not.toBe(key3); // topology changed
  });
});
