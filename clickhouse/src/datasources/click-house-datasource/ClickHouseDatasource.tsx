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

import type { DatasourcePlugin } from '@perses-dev/plugin-system';
import type { BuiltinVariableDefinition } from '@perses-dev/spec';

import { createClickHouseClient } from '../../model/click-house-client';
import { getQueryMethod, HEALTH_CHECK_PATH } from './allowed-endpoints';
import type { ClickHouseDatasourceSpec, ClickHouseDatasourceClient } from './click-house-datasource-types';
import { ClickHouseDatasourceEditor } from './ClickHouseDatasourceEditor';

/** Database of the queries of a datasource that does not name one. */
export const DEFAULT_DATABASE = 'default';

const createClient: DatasourcePlugin<ClickHouseDatasourceSpec, ClickHouseDatasourceClient>['createClient'] = (
  spec,
  options,
) => {
  const { directUrl, proxy, database } = spec;
  const { proxyUrl, fetch: customFetch } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error(
      'No URL specified for ClickHouseDatasource client. You can use directUrl in the spec to configure it.',
    );
  }

  const queryDatabase = database?.trim() || DEFAULT_DATABASE;
  const client = createClickHouseClient({
    datasourceUrl,
    database: queryDatabase,
    headers: proxy?.spec.headers,
    fetch: customFetch,
    method: directUrl === undefined ? getQueryMethod(proxy?.spec.allowedEndpoints) : 'POST',
    cors: directUrl !== undefined,
  });

  return {
    options: {
      datasourceUrl,
      database: queryDatabase,
    },
    ...client,
  };
};

// The macros are replaced by the queries. Declaring them makes the editors document them as variables.
const getBuiltinVariableDefinitions = (): BuiltinVariableDefinition[] =>
  [
    {
      name: '__interval_s',
      description:
        'Interval between two data points, in seconds: a round duration of at least the step of the panel. Use it to size time buckets, e.g. `toStartOfInterval(Timestamp, INTERVAL $__interval_s second)`.',
    },
    {
      name: '__interval_ms',
      description: 'Same as $__interval_s but in milliseconds.',
    },
    {
      name: '__fromTime',
      description: 'Start of the time range as a DateTime. $__fromTime_ms has millisecond precision.',
    },
    {
      name: '__toTime',
      description: 'End of the time range as a DateTime. $__toTime_ms has millisecond precision.',
    },
  ].map(({ name, description }) => ({
    kind: 'BuiltinVariable',
    spec: {
      name,
      // Left as is: the queries replace it with the value computed for their time range and panel.
      value: () => `$${name}`,
      source: 'ClickHouse',
      display: { name, description, hidden: true },
    },
  }));

export const ClickHouseDatasource: DatasourcePlugin<ClickHouseDatasourceSpec, ClickHouseDatasourceClient> = {
  createClient,
  getBuiltinVariableDefinitions,
  healthCheckPath: HEALTH_CHECK_PATH,
  OptionsEditorComponent: ClickHouseDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
