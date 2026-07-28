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

import { DatasourcePlugin } from '@perses-dev/plugin-system';
import { greptimedbQuery } from '../../model/greptimedb-client';
import { GreptimeDBDatasourceClient, GreptimeDBDatasourceSpec } from './greptimedb-datasource-types';
import { GreptimeDBDatasourceEditor } from './GreptimeDBDatasourceEditor';

const createClient: DatasourcePlugin<GreptimeDBDatasourceSpec, GreptimeDBDatasourceClient>['createClient'] = (
  spec,
  options
) => {
  const { directUrl, headers, proxy } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error(
      'No URL specified for GreptimeDBDatasource client. You can use directUrl in the spec to configure it.'
    );
  }

  // Support directUrl auth headers while keeping backward compatibility with proxy headers.
  const specHeaders = {
    ...(proxy?.spec.headers ?? {}),
    ...(headers ?? {}),
  };

  return {
    options: {
      datasourceUrl,
    },
    query: (params, headers) =>
      greptimedbQuery(params, {
        datasourceUrl,
        headers: headers ?? specHeaders,
      }),
  };
};

export const GreptimeDBDatasource: DatasourcePlugin<GreptimeDBDatasourceSpec, GreptimeDBDatasourceClient> = {
  createClient,
  OptionsEditorComponent: GreptimeDBDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
