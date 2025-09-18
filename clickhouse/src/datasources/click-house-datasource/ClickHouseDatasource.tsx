// Copyright 2025 The Perses Authors
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
import { ClickHouseDatasourceSpec, ClickHouseDatasourceClient } from './click-house-datasource-types';
import { ClickHouseDatasourceEditor } from './ClickHouseDatasourceEditor';
import { query } from '../../model/click-house-client';

const createClient: DatasourcePlugin<ClickHouseDatasourceSpec, ClickHouseDatasourceClient>['createClient'] = (
  spec,
  options
) => {
  const { directUrl, proxy } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error(
      'No URL specified for ClickHouseDatasource client. You can use directUrl in the spec to configure it.'
    );
  }

  const specHeaders = proxy?.spec.headers || {};

  return {
    options: {
      datasourceUrl,
    },
    query: (params, headers) => query(params, { datasourceUrl, headers: headers ?? specHeaders }),
  };
};

export const ClickHouseDatasource: DatasourcePlugin<ClickHouseDatasourceSpec, ClickHouseDatasourceClient> = {
  createClient,
  OptionsEditorComponent: ClickHouseDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
