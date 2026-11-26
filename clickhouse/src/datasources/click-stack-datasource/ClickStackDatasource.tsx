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

import { API_ROOT_PATH, createClickStackClient } from '../../model/click-stack-client';
import type { ClickStackDatasourceClient, ClickStackDatasourceSpec } from './click-stack-datasource-types';
import { ClickStackDatasourceEditor } from './ClickStackDatasourceEditor';

const createClient: DatasourcePlugin<ClickStackDatasourceSpec, ClickStackDatasourceClient>['createClient'] = (
  spec,
  options,
) => {
  const { directUrl, proxy, uiUrl } = spec;
  const { proxyUrl, fetch: customFetch } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error(
      'No URL specified for ClickStackDatasource client. You can use directUrl in the spec to configure it.',
    );
  }

  return {
    options: {
      datasourceUrl,
      uiUrl: uiUrl || undefined,
    },
    ...createClickStackClient({ datasourceUrl, headers: proxy?.spec.headers, fetch: customFetch }),
  };
};

export const ClickStackDatasource: DatasourcePlugin<ClickStackDatasourceSpec, ClickStackDatasourceClient> = {
  createClient,
  healthCheckPath: API_ROOT_PATH,
  OptionsEditorComponent: ClickStackDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
