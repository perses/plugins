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

import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockReplaceVariables = vi.hoisted(() => vi.fn((text: string, _variables: unknown) => text));
vi.mock('@perses-dev/plugin-system', () => ({
  replaceVariables: (text: string, variables: unknown): string => mockReplaceVariables(text, variables),
}));

import type { JsonDatasourceClient } from '../../datasources/json-datasource/json-datasource-types';
import { getJsonData } from './get-json-data';
import type { JsonQuerySpec } from './json-query-types';

const makeClient = (): JsonDatasourceClient => ({
  options: { datasourceUrl: 'http://api.example' },
  query: vi.fn(async () => ({ items: ['a', 'b', 'c'] })),
});

function createContext(client: JsonDatasourceClient): Parameters<typeof getJsonData>[1] {
  return {
    variableState: {},
    datasourceStore: {
      getDatasource: vi.fn(),
      getDatasourceClient: vi.fn(() => Promise.resolve(client)),
      listDatasourceSelectItems: vi.fn(async () => []),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
  } as unknown as Parameters<typeof getJsonData>[1];
}

describe('getJsonData', () => {
  beforeEach(() => {
    mockReplaceVariables.mockImplementation((text: string) => text);
  });

  it('calls client.query with the correct parameters', async () => {
    const client = makeClient();
    const spec: JsonQuerySpec = { endpointUrl: '/data', method: 'GET' };

    await getJsonData(spec, createContext(client));

    expect(client.query).toHaveBeenCalledWith({
      endpointUrl: '/data',
      method: 'GET',
      queryParams: undefined,
      body: undefined,
    });
  });

  it('returns the response from client.query directly when no JSONata expression', async () => {
    const client = makeClient();
    const spec: JsonQuerySpec = { endpointUrl: '/data', method: 'GET' };

    const result = await getJsonData(spec, createContext(client));

    expect(result).toEqual({ data: { items: ['a', 'b', 'c'] } });
  });

  it('defaults to GET when method is not specified', async () => {
    const client = makeClient();
    const spec: JsonQuerySpec = { endpointUrl: '/data' };

    await getJsonData(spec, createContext(client));

    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET' }));
  });

  it('forwards query params to client.query', async () => {
    const client = makeClient();
    const spec: JsonQuerySpec = { endpointUrl: '/search', method: 'GET', queryParams: { q: 'test', limit: '5' } };

    await getJsonData(spec, createContext(client));

    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ queryParams: { q: 'test', limit: '5' } }));
  });

  it('forwards body to client.query for POST', async () => {
    const client = makeClient();
    const body = '{"filter":"active"}';
    const spec: JsonQuerySpec = { endpointUrl: '/query', method: 'POST', body };

    await getJsonData(spec, createContext(client));

    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', body }));
  });

  it('passes variableState to replaceVariables for endpointUrl interpolation', async () => {
    const client = makeClient();
    const variableState = { env: { value: 'prod', loading: false } };
    mockReplaceVariables.mockImplementation((text: string) => (text === '/api/$env/data' ? '/api/prod/data' : text));
    const spec: JsonQuerySpec = { endpointUrl: '/api/$env/data', method: 'GET' };
    const context = { ...createContext(client), variableState };

    await getJsonData(spec, context as unknown as Parameters<typeof getJsonData>[1]);

    expect(mockReplaceVariables).toHaveBeenCalledWith('/api/$env/data', variableState);
    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ endpointUrl: '/api/prod/data' }));
  });

  it('passes variableState to replaceVariables for each query param value', async () => {
    const client = makeClient();
    const variableState = { team: { value: 'ops', loading: false } };
    mockReplaceVariables.mockImplementation((text: string) => (text === '$team' ? 'ops' : text));
    const spec: JsonQuerySpec = { endpointUrl: '/data', method: 'GET', queryParams: { team: '$team', env: 'prod' } };
    const context = { ...createContext(client), variableState };

    await getJsonData(spec, context as unknown as Parameters<typeof getJsonData>[1]);

    expect(mockReplaceVariables).toHaveBeenCalledWith('$team', variableState);
    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ queryParams: { team: 'ops', env: 'prod' } }));
  });

  it('passes variableState to replaceVariables for body interpolation', async () => {
    const client = makeClient();
    const variableState = { env: { value: 'staging', loading: false } };
    mockReplaceVariables.mockImplementation((text: string) => (text === '{"env":"$env"}' ? '{"env":"staging"}' : text));
    const spec: JsonQuerySpec = { endpointUrl: '/query', method: 'POST', body: '{"env":"$env"}' };
    const context = { ...createContext(client), variableState };

    await getJsonData(spec, context as unknown as Parameters<typeof getJsonData>[1]);

    expect(mockReplaceVariables).toHaveBeenCalledWith('{"env":"$env"}', variableState);
    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ body: '{"env":"staging"}' }));
  });

  describe('JSONata transformation', () => {
    it('applies JSONata expression to the response', async () => {
      const client = makeClient();
      client.query = vi.fn(async () => ({ users: [{ name: 'Alice' }, { name: 'Bob' }] }));
      const spec: JsonQuerySpec = { endpointUrl: '/users', method: 'GET', jsonataExpression: 'users.name' };

      const result = await getJsonData(spec, createContext(client));

      expect(JSON.stringify(result)).toBe(JSON.stringify({ data: ['Alice', 'Bob'] }));
    });

    it('throws when JSONata expression matches nothing', async () => {
      const client = makeClient();
      client.query = vi.fn(async () => ({ data: [] }));
      const spec: JsonQuerySpec = { endpointUrl: '/data', method: 'GET', jsonataExpression: 'nonexistent.path' };

      await expect(getJsonData(spec, createContext(client))).rejects.toThrow(
        'JSONata expression did not match any data',
      );
    });

    it('returns raw response when jsonataExpression is not set', async () => {
      const client = makeClient();
      const raw = { value: 99 };
      client.query = vi.fn(async () => raw);
      const spec: JsonQuerySpec = { endpointUrl: '/data', method: 'GET' };

      const result = await getJsonData(spec, createContext(client));

      expect(result).toEqual({ data: raw });
    });
  });

  it('returns empty array when API returns empty array', async () => {
    const client = makeClient();
    client.query = vi.fn(async () => []);
    const spec: JsonQuerySpec = { endpointUrl: '/empty', method: 'GET' };

    const result = await getJsonData(spec, createContext(client));

    expect(result).toEqual({ data: [] });
  });
});
