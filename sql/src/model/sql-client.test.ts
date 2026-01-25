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

import { query } from './sql-client';

global.fetch = jest.fn();

describe('sql-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const mockResponse = {
        columns: [
          { name: 'time', type: 'timestamp' },
          { name: 'value', type: 'float' },
        ],
        rows: [{ time: '2026-01-25T10:00:00Z', value: 42 }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await query(
        { query: 'SELECT * FROM metrics' },
        {
          datasourceUrl: 'http://localhost:8080/api/proxy',
          spec: {
            proxy: {
              kind: 'SQLProxy',
              spec: {
                driver: 'postgres',
                host: 'localhost:5432',
                database: 'testdb',
              },
            },
          },
        }
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/proxy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ query: 'SELECT * FROM metrics' }),
        })
      );
    });

    it('should throw error when datasource URL is missing', async () => {
      await expect(
        query(
          { query: 'SELECT * FROM metrics' },
          {
            datasourceUrl: '',
            spec: {
              proxy: {
                kind: 'SQLProxy',
                spec: {
                  driver: 'postgres',
                  host: 'localhost:5432',
                  database: 'testdb',
                },
              },
            },
          }
        )
      ).rejects.toThrow('No datasource URL provided');
    });

    it('should handle query errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Table does not exist',
      });

      await expect(
        query(
          { query: 'SELECT * FROM nonexistent' },
          {
            datasourceUrl: 'http://localhost:8080/api/proxy',
            spec: {
              proxy: {
                kind: 'SQLProxy',
                spec: {
                  driver: 'postgres',
                  host: 'localhost:5432',
                  database: 'testdb',
                },
              },
            },
          }
        )
      ).rejects.toThrow('SQL query failed: 400 Bad Request - Table does not exist');
    });

    it('should include custom headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ columns: [], rows: [] }),
      });

      await query(
        {
          query: 'SELECT * FROM metrics',
          headers: {
            'X-Custom-Header': 'test-value',
          },
        },
        {
          datasourceUrl: 'http://localhost:8080/api/proxy',
          headers: {
            Authorization: 'Bearer token',
          },
          spec: {
            proxy: {
              kind: 'SQLProxy',
              spec: {
                driver: 'postgres',
                host: 'localhost:5432',
                database: 'testdb',
              },
            },
          },
        }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/proxy',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });

    it('should handle abort signal', async () => {
      const abortController = new AbortController();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ columns: [], rows: [] }),
      });

      await query(
        {
          query: 'SELECT * FROM metrics',
          abortSignal: abortController.signal,
        },
        {
          datasourceUrl: 'http://localhost:8080/api/proxy',
          spec: {
            proxy: {
              kind: 'SQLProxy',
              spec: {
                driver: 'postgres',
                host: 'localhost:5432',
                database: 'testdb',
              },
            },
          },
        }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/proxy',
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });
  });
});
