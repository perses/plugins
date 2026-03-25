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

import { TimeSeriesData } from '@perses-dev/core';
import { escapeCsvValue, PanelData } from '@perses-dev/plugin-system';
import { TableOptions } from './models';
import { buildTableData } from './TableExportAction';

function makePanelData(series: TimeSeriesData['series']): PanelData<TimeSeriesData> {
  return {
    definition: {
      kind: 'TimeSeriesQuery',
      spec: { plugin: { kind: 'PrometheusTimeSeriesQuery', spec: { query: '' } } },
    },
    data: {
      timeRange: { start: new Date(1666625535000), end: new Date(1666625535000) },
      stepMs: 15000,
      series,
    },
  };
}

describe('escapeCsvValue', () => {
  it('returns empty string for null', () => {
    expect(escapeCsvValue(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCsvValue(undefined)).toBe('');
  });

  it('returns plain string unchanged', () => {
    expect(escapeCsvValue('hello')).toBe('hello');
  });

  it('wraps value containing comma in quotes', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
  });

  it('escapes double quotes inside value', () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps value containing newline in quotes', () => {
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('wraps value containing carriage return in quotes', () => {
    expect(escapeCsvValue('line1\rline2')).toBe('"line1\rline2"');
  });

  it('converts numbers to string', () => {
    expect(escapeCsvValue(42)).toBe('42');
  });

  it('returns empty string for empty string input', () => {
    expect(escapeCsvValue('')).toBe('');
  });

  it('converts booleans to string', () => {
    expect(escapeCsvValue(true)).toBe('true');
    expect(escapeCsvValue(false)).toBe('false');
  });
});

describe('buildTableData', () => {
  const singleQueryResult: Array<PanelData<TimeSeriesData>> = [
    makePanelData([
      {
        name: 'series-a',
        values: [[1666479357903, 0.277]],
        labels: { device: '/dev/vda1', env: 'demo' },
      },
      {
        name: 'series-b',
        values: [[1666479357903, 0.085]],
        labels: { device: '/dev/vda15', env: 'demo' },
      },
    ]),
  ];

  it('produces tabular rows with timestamp, value, and label columns for a single query', () => {
    const { data, columns } = buildTableData(singleQueryResult, {});

    expect(data).toHaveLength(2);
    expect(columns.map((c) => c.header)).toEqual(expect.arrayContaining(['timestamp', 'value', 'device', 'env']));

    expect(data[0]).toMatchObject({ timestamp: 1666479357903, value: 0.277, device: '/dev/vda1', env: 'demo' });
    expect(data[1]).toMatchObject({ timestamp: 1666479357903, value: 0.085, device: '/dev/vda15', env: 'demo' });
  });

  it('uses indexed column names for multi-query results', () => {
    const multiQueryResults: Array<PanelData<TimeSeriesData>> = [
      makePanelData([{ name: 'q1', values: [[1000, 100]], labels: { instance: 'server-a' } }]),
      makePanelData([{ name: 'q2', values: [[1000, 200]], labels: { instance: 'server-a' } }]),
    ];

    const { data, columns } = buildTableData(multiQueryResults, {});

    const headers = columns.map((c) => c.header);
    expect(headers).toContain('value #1');
    expect(headers).toContain('value #2');
    expect(headers).toContain('instance #1');
    expect(headers).toContain('instance #2');
    expect(headers).not.toContain('value');
    expect(headers).not.toContain('instance');

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ 'value #1': 100, 'instance #1': 'server-a' });
    expect(data[1]).toMatchObject({ 'value #2': 200, 'instance #2': 'server-a' });
  });

  it('applies MergeSeries transform to combine multi-query rows', () => {
    const multiQueryResults: Array<PanelData<TimeSeriesData>> = [
      makePanelData([
        { name: 'q1-a', values: [[1000, 10]], labels: { mount: '/' } },
        { name: 'q1-b', values: [[1000, 20]], labels: { mount: '/boot' } },
      ]),
      makePanelData([
        { name: 'q2-a', values: [[1000, 50]], labels: { mount: '/' } },
        { name: 'q2-b', values: [[1000, 60]], labels: { mount: '/boot' } },
      ]),
    ];
    const spec: TableOptions = {
      transforms: [{ kind: 'MergeSeries', spec: {} }],
    };

    const { data } = buildTableData(multiQueryResults, spec);

    // MergeSeries merges indexed label columns and joins rows by label values.
    // Without MergeSeries we'd have 4 rows; with it, 2 rows (one per mount).
    expect(data).toHaveLength(2);

    const rowSlash = data.find((r) => r['mount'] === '/');
    const rowBoot = data.find((r) => r['mount'] === '/boot');
    expect(rowSlash).toBeDefined();
    expect(rowBoot).toBeDefined();

    expect(rowSlash).toMatchObject({ 'value #1': 10, 'value #2': 50, mount: '/' });
    expect(rowBoot).toMatchObject({ 'value #1': 20, 'value #2': 60, mount: '/boot' });
  });

  it('applies JoinByColumnValue transform to merge rows by shared label', () => {
    const { data } = buildTableData(singleQueryResult, {
      transforms: [{ kind: 'JoinByColumnValue', spec: { columns: ['env'] } }],
    });

    // Both series share env='demo', so they merge into 1 row
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ env: 'demo' });
  });

  it('excludes hidden columns from export', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'env', hide: true }],
    };

    const { columns } = buildTableData(singleQueryResult, spec);
    const headers = columns.map((c) => c.header);

    expect(headers).not.toContain('env');
    expect(headers).toContain('value');
    expect(headers).toContain('device');
  });

  it('uses custom header names from columnSettings', () => {
    const spec: TableOptions = {
      columnSettings: [
        { name: 'value', header: 'Metric Value' },
        { name: 'device', header: 'Disk Device' },
      ],
    };

    const { columns } = buildTableData(singleQueryResult, spec);

    const metricCol = columns.find((c) => c.key === 'value');
    const deviceCol = columns.find((c) => c.key === 'device');
    expect(metricCol?.header).toBe('Metric Value');
    expect(deviceCol?.header).toBe('Disk Device');
  });

  it('orders columns by columnSettings first, then remaining data columns', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'env' }, { name: 'device' }],
    };

    const { columns } = buildTableData(singleQueryResult, spec);
    const headers = columns.map((c) => c.header);

    // columnSettings columns appear first in order
    expect(headers.indexOf('env')).toBeLessThan(headers.indexOf('device'));
    // Remaining columns appear after
    expect(headers.indexOf('device')).toBeLessThan(headers.indexOf('timestamp'));
  });

  it('hides all unlisted columns when defaultColumnHidden is true', () => {
    const spec: TableOptions = {
      defaultColumnHidden: true,
      columnSettings: [{ name: 'value', header: 'Val' }, { name: 'env' }],
    };

    const { columns } = buildTableData(singleQueryResult, spec);
    const headers = columns.map((c) => c.header);

    expect(headers).toEqual(['Val', 'env']);
  });

  it('handles a query whose data has not loaded yet', () => {
    const pendingResult: Array<PanelData<TimeSeriesData>> = [
      {
        definition: { kind: 'TimeSeriesQuery', spec: { plugin: { kind: 'P', spec: {} } } },
      } as PanelData<TimeSeriesData>,
    ];

    const { data, columns } = buildTableData(pendingResult, {});

    expect(data).toHaveLength(0);
    expect(columns).toHaveLength(0);
  });

  it('returns label-only rows for series with no values', () => {
    const emptyValuesResult: Array<PanelData<TimeSeriesData>> = [
      makePanelData([{ name: 'empty', values: [], labels: { host: 'abc' } }]),
    ];

    const { data } = buildTableData(emptyValuesResult, {});

    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(expect.objectContaining({ host: 'abc' }));
    expect(data[0]).not.toHaveProperty('value');
    expect(data[0]).not.toHaveProperty('timestamp');
  });

  it('omits timestamp column in range query mode', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'value', plugin: { kind: 'StatChart', spec: {} } }],
    };

    const { data, columns } = buildTableData(singleQueryResult, spec);
    const headers = columns.map((c) => c.header);

    expect(headers).not.toContain('timestamp');
    expect(data[0]).not.toHaveProperty('timestamp');
    expect(data[0]).toHaveProperty('value');
  });

  it('uses raw scalar values instead of embedded plugin objects', () => {
    const spec: TableOptions = {
      columnSettings: [{ name: 'value', plugin: { kind: 'StatChart', spec: {} } }],
    };

    const { data } = buildTableData(singleQueryResult, spec);

    // Even with a plugin column setting, export should emit the raw number
    expect(typeof data[0]?.['value']).toBe('number');
    expect(data[0]?.['value']).toBe(0.277);
  });
});
