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

import type { GetVariableOptionsContext, VariableOption } from '@perses-dev/plugin-system';
import type { Mock } from 'vitest';

import type { TrinoColumn, TrinoQueryParams, TrinoQueryResponse, TrinoRow } from '../model/trino-client';
import { MAX_VARIABLE_ROWS, TrinoSQLVariable } from './TrinoSQLVariable';

const queryMock: Mock<(params: TrinoQueryParams) => Promise<TrinoQueryResponse>> = vi.fn();

const createContext = (): GetVariableOptionsContext => ({
  variables: { env: { value: 'prod', loading: false }, tenant: { value: 'acme', loading: false } },
  datasourceStore: {
    getDatasource: vi.fn(),
    getDatasourceClient: vi.fn().mockResolvedValue({ query: queryMock }),
    listDatasourceSelectItems: vi.fn(),
    getLocalDatasources: vi.fn(),
    setLocalDatasources: vi.fn(),
    getSavedDatasources: vi.fn(),
    setSavedDatasources: vi.fn(),
  },
  timeRange: { start: new Date('2025-01-01T00:00:00.000Z'), end: new Date('2025-01-02T00:00:00.000Z') },
});

async function options(data: TrinoRow[], names: string[]): Promise<VariableOption[]> {
  const columns: TrinoColumn[] = names.map((name) => ({ name, type: 'varchar' }));
  queryMock.mockResolvedValueOnce({ status: 'success', data, columns });
  return (await TrinoSQLVariable.getVariableOptions({ query: 'SELECT 1' }, createContext())).data;
}

describe('TrinoSQLVariable', () => {
  beforeEach(() => queryMock.mockReset());

  it('resolves variable dependencies from the query and context fields', () => {
    const { variables } = TrinoSQLVariable.dependsOn!(
      { query: "SELECT 1 WHERE e = '$env'", catalog: '$tenant' },
      createContext(),
    );
    expect(variables).toEqual(['env', 'tenant']);
  });

  it('creates initial options with an empty query', () => {
    expect(TrinoSQLVariable.createInitialOptions()).toEqual({ query: '' });
  });

  it('returns no options for an empty query without querying', async () => {
    expect(await TrinoSQLVariable.getVariableOptions({ query: ' ' }, createContext())).toEqual({ data: [] });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('uses one column as both value and label, with a real Trino result', async () => {
    // Trino 484 result of SELECT DISTINCT region ... ORDER BY region.
    expect(await options([{ region: 'eu-west' }, { region: 'us-east' }], ['region'])).toEqual([
      { value: 'eu-west', label: 'eu-west' },
      { value: 'us-east', label: 'us-east' },
    ]);
  });

  it('uses the second column as the label, with a real Trino result', async () => {
    const data = [
      { value: 'h-003', label: 'db-1 (eu-west)' },
      { value: 'h-001', label: 'web-1 (us-east)' },
    ];
    expect(await options(data, ['value', 'label'])).toEqual([
      { value: 'h-003', label: 'db-1 (eu-west)' },
      { value: 'h-001', label: 'web-1 (us-east)' },
    ]);
  });

  it('follows the column order rather than the column names', async () => {
    expect(await options([{ label: 'L', value: 'V' }], ['value', 'label'])).toEqual([{ value: 'V', label: 'L' }]);
  });

  it('skips null values and falls back to the value for a null label', async () => {
    const data = [
      { v: null, l: 'x' },
      { v: 'a', l: null },
      { v: undefined, l: 'y' },
    ];
    expect(await options(data, ['v', 'l'])).toEqual([{ value: 'a', label: 'a' }]);
  });

  it('keeps the first of duplicate values', async () => {
    const data = [
      { v: 'a', l: 'first' },
      { v: 'b', l: 'b' },
      { v: 'a', l: 'second' },
    ];
    expect(await options(data, ['v', 'l'])).toEqual([
      { value: 'a', label: 'first' },
      { value: 'b', label: 'b' },
    ]);
  });

  it('stringifies numbers and booleans', async () => {
    expect(await options([{ n: 1 }, { n: 0 }, { n: false }, { n: true }], ['n'])).toEqual([
      { value: '1', label: '1' },
      { value: '0', label: '0' },
      { value: 'false', label: 'false' },
      { value: 'true', label: 'true' },
    ]);
  });

  it('returns no options for an empty result', async () => {
    expect(await options([], ['a'])).toEqual([]);
  });

  it('handles the same column selected twice', async () => {
    expect(await options([{ a: 'x' }], ['a', 'a'])).toEqual([{ value: 'x', label: 'x' }]);
  });

  it('caps the options at the row limit', async () => {
    const data = Array.from({ length: MAX_VARIABLE_ROWS + 5 }, (_, i) => ({ v: `v${i}` }));
    const result = await options(data, ['v']);
    expect(result).toHaveLength(MAX_VARIABLE_ROWS);
    expect(result.at(-1)?.value).toBe(`v${MAX_VARIABLE_ROWS - 1}`);
  });

  it('interpolates variables, the time range and the context fields', async () => {
    const signal = new AbortController().signal;
    queryMock.mockResolvedValueOnce({ status: 'success', data: [] });

    await TrinoSQLVariable.getVariableOptions(
      { query: "SELECT 1 WHERE e = '$env' AND t > '{start}' AND t < '{end}'", schema: '$tenant' },
      createContext(),
      signal,
    );

    expect(queryMock).toHaveBeenCalledWith({
      maxRows: MAX_VARIABLE_ROWS,
      query: "SELECT 1 WHERE e = 'prod' AND t > '2025-01-01 00:00:00' AND t < '2025-01-02 00:00:00'",
      start: '2025-01-01 00:00:00',
      end: '2025-01-02 00:00:00',
      schema: 'acme',
      signal,
    });
  });

  it('uses the datasource selector from the spec and limits the rows read', async () => {
    const ctx = createContext();
    queryMock.mockResolvedValueOnce({ status: 'success', data: [] });
    const datasource = { kind: 'TrinoDatasource', name: 'other' };
    await TrinoSQLVariable.getVariableOptions({ query: 'SELECT 1', datasource }, ctx);
    expect(ctx.datasourceStore.getDatasourceClient).toHaveBeenCalledWith(datasource);
    expect(queryMock).toHaveBeenCalledWith(expect.objectContaining({ maxRows: MAX_VARIABLE_ROWS }));
  });
});
