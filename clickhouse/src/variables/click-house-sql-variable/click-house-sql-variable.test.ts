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

import type { VariablePlugin } from '@perses-dev/plugin-system';

import { stubClient, stubDatasourceStore, stubResponse } from '../../test/stubs';
import { ClickHouseSQLVariable } from './ClickHouseSQLVariable';
import { buildVariableOptions } from './get-variable-options';

type VariableContext = Parameters<VariablePlugin['getVariableOptions']>[1];

describe('buildVariableOptions', () => {
  it('takes the values from the first column, once each', () => {
    expect(
      buildVariableOptions(
        stubResponse(
          [
            ['ServiceName', 'String'],
            ['spans', 'UInt64'],
          ],
          [['api', '3'], ['web', '2'], ['api', '1'], [''], [null]],
        ),
      ),
    ).toEqual([
      { value: 'api', label: 'api' },
      { value: 'web', label: 'web' },
    ]);
  });

  it('takes the values and their labels from the "value" and "label" columns', () => {
    expect(
      buildVariableOptions(
        stubResponse(
          [
            ['Label', 'String'],
            ['Value', 'UInt32'],
          ],
          [
            ['Checkout', 7],
            ['', 8],
          ],
        ),
      ),
    ).toEqual([
      { value: '7', label: 'Checkout' },
      { value: '8', label: '8' },
    ]);
  });
});

describe('ClickHouseSQLVariable', () => {
  it('runs the query with the time range and the other variables', async () => {
    const client = stubClient(() => stubResponse([['SpanName', 'String']], [['GET /cart']]));
    const context = {
      datasourceStore: stubDatasourceStore(client),
      variables: { service: { value: ['api'], loading: false } },
      timeRange: { start: new Date('2026-01-01T10:00:00.000Z'), end: new Date('2026-01-01T11:00:00.000Z') },
    } as unknown as VariableContext;
    const spec = {
      query:
        'SELECT DISTINCT SpanName FROM otel_traces WHERE $__timeFilter(Timestamp) AND ServiceName IN (${service:sqlstring})',
    };

    await expect(ClickHouseSQLVariable.getVariableOptions(spec, context)).resolves.toEqual({
      data: [{ value: 'GET /cart', label: 'GET /cart' }],
    });
    expect(client.statements()).toEqual([
      "SELECT DISTINCT SpanName FROM otel_traces WHERE (Timestamp >= toDateTime(1767261600) AND Timestamp <= toDateTime(1767265200)) AND ServiceName IN ('api')",
    ]);
    expect(ClickHouseSQLVariable.dependsOn?.(spec, context)).toEqual({ variables: ['service'] });
  });
});
