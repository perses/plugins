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

import type { CloudWatchClient } from '../../model';
import { createCloudWatchClient } from '../../model';
import type { CloudWatchDatasourceSpec } from './cloudwatch-datasource-types';
import { newCloudWatchDatasourceSpec } from './cloudwatch-datasource-types';
import { CloudWatchDatasourceEditor } from './CloudWatchDatasourceEditor';

const createClient: DatasourcePlugin<CloudWatchDatasourceSpec, CloudWatchClient>['createClient'] = (_spec, options) => {
  const { proxyUrl, fetch } = options;
  if (proxyUrl === undefined) {
    throw new Error('CloudWatch can only be queried through the Perses server proxy, which signs the requests.');
  }
  return createCloudWatchClient({ datasourceUrl: proxyUrl, fetch });
};

// healthCheckPath is not set: the CloudWatch API only accepts signed POST requests, so the generic connection test
// (a GET on the health check path) doesn't apply. The connection is checked by a query or a metric discovery.
export const CloudWatchDatasource: DatasourcePlugin<CloudWatchDatasourceSpec, CloudWatchClient> = {
  createClient,
  OptionsEditorComponent: CloudWatchDatasourceEditor,
  createInitialOptions: () => newCloudWatchDatasourceSpec('us-east-1'),
};
