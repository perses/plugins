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
import type { JsonData, TimeSeriesData } from '@perses-dev/spec';

import type { TableOptions } from './models';
import { buildJsonTableData, buildRawTableData, getTablePanelQueryMode } from './table-data-utils';

function makeTsPanelData(series: TimeSeriesData['series']): PanelData<TimeSeriesData> {
  return {
    definition: {
      kind: 'TimeSeriesQuery',
      spec: { plugin: { kind: 'PrometheusTimeSeriesQuery', spec: { query: '' } } },
    },
    data: {
      timeRange: { start: new Date(0), end: new Date(0) },
      stepMs: 15000,
      series,
    },
  };
}

function makeJsonPanelData(payload: unknown): PanelData<JsonData> {
  return {
    definition: {
      kind: 'JsonQuery',
      spec: { plugin: { kind: 'JsonQuery', spec: {} } },
    },
    data: { data: payload },
  };
}

describe('getTablePanelQueryMode', () => {
  it('returns instant when there are no column settings', () => {
    expect(getTablePanelQueryMode({})).toBe('instant');
  });

  it('returns instant when column settings have no plugin', () => {
    const spec: TableOptions = { columnSettings: [{ name: 'value' }, { name: 'host' }] };
    expect(getTablePanelQueryMode(spec)).toBe('instant');
  });

  it('returns range when any column has a plugin', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'value', plugin: { kind: 'StatChart', spec: {} } }],
    };
    expect(getTablePanelQueryMode(spec)).toBe('range');
  });

  it('returns range when only one of many columns has a plugin', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'host' }, { name: 'value', plugin: { kind: 'StatChart', spec: {} } }, { name: 'env' }],
    };
    expect(getTablePanelQueryMode(spec)).toBe('range');
  });
});

describe('buildJsonTableData', () => {
  it('returns empty array for no results', () => {
    expect(buildJsonTableData([])).toEqual([]);
  });

  it('maps an object payload to a single row', () => {
    const rows = buildJsonTableData([makeJsonPanelData({ name: 'Alice', age: 30 })]);
    expect(rows).toEqual([{ name: 'Alice', age: 30 }]);
  });

  it('wraps a numeric primitive in { value }', () => {
    expect(buildJsonTableData([makeJsonPanelData(42)])).toEqual([{ value: 42 }]);
  });

  it('wraps a string primitive in { value }', () => {
    expect(buildJsonTableData([makeJsonPanelData('hello')])).toEqual([{ value: 'hello' }]);
  });

  it('wraps a boolean primitive in { value }', () => {
    expect(buildJsonTableData([makeJsonPanelData(true)])).toEqual([{ value: true }]);
  });

  it('wraps null in { value: null }', () => {
    expect(buildJsonTableData([makeJsonPanelData(null)])).toEqual([{ value: null }]);
  });

  it('JSON-stringifies nested object values', () => {
    const rows = buildJsonTableData([makeJsonPanelData({ meta: { env: 'prod' }, count: 1 })]);
    expect(rows).toEqual([{ meta: '{"env":"prod"}', count: 1 }]);
  });

  it('JSON-stringifies nested array values', () => {
    const rows = buildJsonTableData([makeJsonPanelData({ tags: ['a', 'b'] })]);
    expect(rows).toEqual([{ tags: '["a","b"]' }]);
  });

  it('leaves scalar values on object rows as-is', () => {
    const rows = buildJsonTableData([makeJsonPanelData({ score: 99, active: false })]);
    expect(rows).toEqual([{ score: 99, active: false }]);
  });

  it('produces one row per query result when each carries a single object', () => {
    const rows = buildJsonTableData([makeJsonPanelData({ id: 1 }), makeJsonPanelData({ id: 2 })]);
    expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('treats an array payload as a single row using numeric index keys (stringifying objects)', () => {
    const rows = buildJsonTableData([makeJsonPanelData([{ a: 1 }, { b: 2 }])]);
    expect(rows).toEqual([{ '0': '{"a":1}', '1': '{"b":2}' }]);
  });

  it('treats an array of primitives as a single row with numeric index keys', () => {
    const rows = buildJsonTableData([makeJsonPanelData([10, 20, 30])]);
    expect(rows).toEqual([{ '0': 10, '1': 20, '2': 30 }]);
  });
});

describe('buildRawTableData', () => {
  it('returns empty array when there are no results', () => {
    expect(buildRawTableData([], {})).toEqual([]);
  });

  it('routes TimeSeriesQuery results to the time-series path', () => {
    const result = buildRawTableData(
      [makeTsPanelData([{ name: 's', values: [[1000, 42]], labels: { host: 'a' } }])],
      {},
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ value: 42, host: 'a' });
  });

  it('routes JsonQuery results to the JSON path', () => {
    const result = buildRawTableData([makeJsonPanelData({ city: 'Paris' })], {});
    expect(result).toEqual([{ city: 'Paris' }]);
  });

  it('concatenates time-series and JSON rows when both kinds are present', () => {
    const result = buildRawTableData(
      [
        makeTsPanelData([{ name: 's', values: [[1000, 7]], labels: { src: 'ts' } }]),
        makeJsonPanelData({ src: 'json' }),
      ],
      {},
    );
    expect(result).toHaveLength(2);
    expect(result.some((r) => r['src'] === 'ts')).toBe(true);
    expect(result.some((r) => r['src'] === 'json')).toBe(true);
  });

  it('includes timestamp in instant mode (default)', () => {
    const result = buildRawTableData([makeTsPanelData([{ name: 's', values: [[9999, 1]], labels: {} }])], {});
    expect(result[0]).toHaveProperty('timestamp', 9999);
  });

  it('omits timestamp in range mode (column with plugin)', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'value', plugin: { kind: 'StatChart', spec: {} } }],
    };
    const result = buildRawTableData([makeTsPanelData([{ name: 's', values: [[9999, 1]], labels: {} }])], spec);
    expect(result[0]).not.toHaveProperty('timestamp');
  });

  it('uses raw scalar value for a plugin column when forExport is true', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'value', plugin: { kind: 'StatChart', spec: {} } }],
    };
    const result = buildRawTableData([makeTsPanelData([{ name: 's', values: [[0, 3.14]], labels: {} }])], spec, {
      forExport: true,
    });
    expect(result[0]?.['value']).toBe(3.14);
  });

  it('embeds PanelData object for a plugin column when not exporting', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'value', plugin: { kind: 'StatChart', spec: {} } }],
    };
    const result = buildRawTableData([makeTsPanelData([{ name: 's', values: [[0, 5]], labels: {} }])], spec);
    // The cell value should be an object (embedded PanelData), not a scalar.
    expect(typeof result[0]?.['value']).toBe('object');
  });

  it('returns label-only row when series has no values', () => {
    const result = buildRawTableData([makeTsPanelData([{ name: 'empty', values: [], labels: { host: 'x' } }])], {});
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ host: 'x' });
    expect(result[0]).not.toHaveProperty('value');
    expect(result[0]).not.toHaveProperty('timestamp');
  });

  it('uses indexed column and label names for multiple time-series queries', () => {
    const result = buildRawTableData(
      [
        makeTsPanelData([{ name: 'q1', values: [[1000, 10]], labels: { dc: 'us' } }]),
        makeTsPanelData([{ name: 'q2', values: [[1000, 20]], labels: { dc: 'eu' } }]),
      ],
      {},
    );
    expect(result[0]).toHaveProperty('value #1', 10);
    expect(result[0]).toHaveProperty('dc #1', 'us');
    expect(result[1]).toHaveProperty('value #2', 20);
    expect(result[1]).toHaveProperty('dc #2', 'eu');
    expect(result[0]).not.toHaveProperty('value');
    expect(result[0]).not.toHaveProperty('dc');
  });

  it('handles a result whose data has not loaded yet (undefined data)', () => {
    const pending = {
      definition: { kind: 'TimeSeriesQuery', spec: { plugin: { kind: 'P', spec: {} } } },
    } as PanelData<TimeSeriesData>;
    expect(buildRawTableData([pending], {})).toEqual([]);
  });
});
