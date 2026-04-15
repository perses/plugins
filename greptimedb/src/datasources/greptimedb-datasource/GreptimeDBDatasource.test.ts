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

import { greptimedbQuery } from '../../model/greptimedb-client';
import { GreptimeDBDatasource } from './GreptimeDBDatasource';

jest.mock('../../model/greptimedb-client', () => ({
  greptimedbQuery: jest.fn(),
}));

const mockedQuery = greptimedbQuery as jest.MockedFunction<typeof greptimedbQuery>;

describe('GreptimeDBDatasource.createClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedQuery.mockResolvedValue({ status: 'success', data: [] });
  });

  it('uses directUrl with spec.headers', async () => {
    const client = GreptimeDBDatasource.createClient(
      {
        directUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer direct-token',
          'x-greptime-db-name': 'metrics',
        },
      },
      {}
    );

    await client.query({
      query: 'select 1',
    });

    expect(mockedQuery).toHaveBeenCalledWith(
      { query: 'select 1' },
      {
        datasourceUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer direct-token',
          'x-greptime-db-name': 'metrics',
        },
      }
    );
  });

  it('lets runtime query headers override spec headers', async () => {
    const client = GreptimeDBDatasource.createClient(
      {
        directUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer from-spec',
        },
      },
      {}
    );

    await client.query(
      {
        query: 'select 1',
      },
      {
        Authorization: 'Bearer runtime',
      }
    );

    expect(mockedQuery).toHaveBeenCalledWith(
      { query: 'select 1' },
      {
        datasourceUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer runtime',
        },
      }
    );
  });
});
