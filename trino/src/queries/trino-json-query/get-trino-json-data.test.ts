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

import type { JsonQueryContext } from '@perses-dev/plugin-system';
import type { Mock } from 'vitest';

import type { TrinoQueryParams, TrinoQueryResponse } from '../../model/trino-client';
import { MAX_ROWS } from '../../model/trino-client';
import { TrinoJsonQuery } from './TrinoJsonQuery';

const queryMock: Mock<(params: TrinoQueryParams) => Promise<TrinoQueryResponse>> = vi.fn();

const createContext = (): JsonQueryContext => ({
  datasourceStore: {
    getDatasource: vi.fn(),
    getDatasourceClient: vi.fn().mockResolvedValue({ query: queryMock }),
    listDatasourceSelectItems: vi.fn(),
    getLocalDatasources: vi.fn(),
    setLocalDatasources: vi.fn(),
    getSavedDatasources: vi.fn(),
    setSavedDatasources: vi.fn(),
  },
  variableState: { region: { value: 'us-east', loading: false }, tenant: { value: 'acme', loading: false } },
});

describe('TrinoJsonQuery', () => {
  beforeEach(() => queryMock.mockReset());

  it('resolves variable dependencies from the query and context fields', () => {
    const { variables } = TrinoJsonQuery.dependsOn!(
      { query: "SELECT * FROM t WHERE r = '$region'", catalog: '$tenant' },
      createContext(),
    );
    expect(variables).toEqual(['region', 'tenant']);
  });

  it('creates initial options with an empty query', () => {
    expect(TrinoJsonQuery.createInitialOptions()).toEqual({ query: '' });
  });

  it('returns no rows for an empty query without querying', async () => {
    expect(await TrinoJsonQuery.getJsonData({ query: '' }, createContext())).toEqual({ data: [] });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns no rows for an empty result', async () => {
    queryMock.mockResolvedValueOnce({ status: 'success', data: [] });
    const result = await TrinoJsonQuery.getJsonData({ query: 'SELECT 1' }, createContext());
    expect(result.data).toEqual([]);
  });

  it('returns each row as an object keyed by column name, with a real Trino result', async () => {
    // Trino 484 result of the top-N example.
    queryMock.mockResolvedValueOnce({
      status: 'success',
      columns: [
        { name: 'service_name', type: 'varchar' },
        { name: 'spans', type: 'bigint' },
        { name: 'errors', type: 'bigint' },
        { name: 'error_pct', type: 'decimal(38,16)' },
      ],
      data: [
        { service_name: 'cartservice', spans: 1, errors: 1, error_pct: '100.0000000000000000' },
        { service_name: 'frontend', spans: 2, errors: 0, error_pct: '0.0000000000000000' },
      ],
    });

    const result = await TrinoJsonQuery.getJsonData({ query: 'SELECT 1' }, createContext());

    const rows = result.data as Array<Record<string, unknown>>;
    expect(Object.keys(rows[0]!)).toEqual(['service_name', 'spans', 'errors', 'error_pct']);
    expect(rows[1]).toEqual({ service_name: 'frontend', spans: 2, errors: 0, error_pct: '0.0000000000000000' });
    expect(result.metadata).toEqual({ executedQueryString: 'SELECT 1' });
  });

  it('passes nested values and nulls through unchanged', async () => {
    const row = { tags: ['a', 'b'], attrs: { k: 'v' }, nested: { x: [1, 2] }, missing: null };
    queryMock.mockResolvedValueOnce({ status: 'success', data: [row] });
    const result = await TrinoJsonQuery.getJsonData({ query: 'SELECT 1' }, createContext());
    expect(result.data).toEqual([row]);
  });

  it('interpolates variables and context fields but leaves {start} and {end}', async () => {
    const signal = new AbortController().signal;
    queryMock.mockResolvedValueOnce({ status: 'success', data: [] });

    const result = await TrinoJsonQuery.getJsonData(
      { query: "SELECT '{start}', '{end}' WHERE r = '$region'", schema: '$tenant', source: 'perses' },
      createContext(),
      signal,
    );

    expect(queryMock).toHaveBeenCalledWith({
      query: "SELECT '{start}', '{end}' WHERE r = 'us-east'",
      schema: 'acme',
      source: 'perses',
      signal,
    });
    expect(result.metadata?.executedQueryString).toBe("SELECT '{start}', '{end}' WHERE r = 'us-east'");
  });

  it('warns when the result was truncated', async () => {
    queryMock.mockResolvedValueOnce({ status: 'success', data: [{ a: 1 }], truncated: true });
    const result = await TrinoJsonQuery.getJsonData({ query: 'SELECT 1' }, createContext());
    expect(result.metadata?.notices).toEqual([
      { type: 'warning', message: `Results were truncated to the first ${MAX_ROWS} rows.` },
    ]);
  });

  it('uses the datasource selector from the spec', async () => {
    const ctx = createContext();
    queryMock.mockResolvedValueOnce({ status: 'success', data: [] });
    const datasource = { kind: 'TrinoDatasource', name: 'other' };
    await TrinoJsonQuery.getJsonData({ query: 'SELECT 1', datasource }, ctx);
    expect(ctx.datasourceStore.getDatasourceClient).toHaveBeenCalledWith(datasource);
  });
});
