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
import {
  AlertManagerClient,
  getAlerts,
  getSilences,
  getSilence,
  createSilence,
  deleteSilence,
  getStatus,
} from '../model';
import { AlertManagerDatasourceSpec } from './types';
import { AlertManagerDatasourceEditor } from './AlertManagerDatasourceEditor';

const createClient: DatasourcePlugin<AlertManagerDatasourceSpec, AlertManagerClient>['createClient'] = (
  spec,
  options
) => {
  const { directUrl, proxy } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error('No URL specified for Alert Manager client. You can use directUrl in the spec to configure it.');
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    getAlerts: (params, headers) => getAlerts(params, { datasourceUrl, headers: headers ?? specHeaders }),
    getSilences: (params, headers) => getSilences(params, { datasourceUrl, headers: headers ?? specHeaders }),
    getSilence: (id, headers) => getSilence(id, { datasourceUrl, headers: headers ?? specHeaders }),
    createSilence: (silence, headers) => createSilence(silence, { datasourceUrl, headers: headers ?? specHeaders }),
    deleteSilence: (id, headers) => deleteSilence(id, { datasourceUrl, headers: headers ?? specHeaders }),
    getStatus: (headers) => getStatus({ datasourceUrl, headers: headers ?? specHeaders }),
  };
};

export const AlertManagerDatasource: DatasourcePlugin<AlertManagerDatasourceSpec, AlertManagerClient> = {
  createClient,
  OptionsEditorComponent: AlertManagerDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
