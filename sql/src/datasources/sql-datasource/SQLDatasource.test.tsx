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

import { SQLDatasource } from './SQLDatasource';
import { SQLDatasourceSpec } from './sql-datasource-types';

describe('SQLDatasource', () => {
  describe('createClient', () => {
    it('should create client with proxy URL', () => {
      const spec: SQLDatasourceSpec = {
        proxy: {
          kind: 'SQLProxy',
          spec: {
            driver: 'postgres',
            host: 'localhost:5432',
            database: 'testdb',
          },
        },
      };

      const options = {
        proxyUrl: 'http://localhost:8080/api/datasources/test/proxy',
      };

      const client = SQLDatasource.createClient(spec, options);

      expect(client).toBeDefined();
      expect(client.options.datasourceUrl).toBe('http://localhost:8080/api/datasources/test/proxy');
    });

    it('should throw error when proxy URL is missing', () => {
      const spec: SQLDatasourceSpec = {
        proxy: {
          kind: 'SQLProxy',
          spec: {
            driver: 'postgres',
            host: 'localhost:5432',
            database: 'testdb',
          },
        },
      };

      const options = {
        proxyUrl: undefined,
      };

      expect(() => {
        SQLDatasource.createClient(spec, options as any);
      }).toThrow('No proxy URL available for SQL datasource');
    });
  });

  describe('createInitialOptions', () => {
    it('should create initial options with default values', () => {
      const initialOptions = SQLDatasource.createInitialOptions();

      expect(initialOptions).toBeDefined();
      expect(initialOptions.proxy).toBeDefined();
      expect(initialOptions.proxy.kind).toBe('SQLProxy');
      expect(initialOptions.proxy.spec.driver).toBe('postgres');
      expect(initialOptions.proxy.spec.host).toBe('');
      expect(initialOptions.proxy.spec.database).toBe('');
    });
  });

  describe('OptionsEditorComponent', () => {
    it('should have an OptionsEditorComponent', () => {
      expect(SQLDatasource.OptionsEditorComponent).toBeDefined();
    });
  });
});
