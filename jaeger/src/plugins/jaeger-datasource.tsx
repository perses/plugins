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
import { getTrace, JaegerClient, searchOperations, searchServices, searchTraces } from '../model';
import { JaegerDatasourceSpec } from './jaeger-datasource-types';
import { JaegerDatasourceEditor } from './JaegerDatasourceEditor';

const createClient: DatasourcePlugin<JaegerDatasourceSpec, JaegerClient>['createClient'] = (spec, options) => {
  const { directUrl, proxy } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error('No URL specified for Jaeger client. You can use directUrl in the spec to configure it.');
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    getTrace: (traceId, headers) => getTrace(traceId, { datasourceUrl, headers: headers ?? specHeaders }),
    searchTraces: (params, headers) => searchTraces(params, { datasourceUrl, headers: headers ?? specHeaders }),
    searchServices: (headers) => searchServices({ datasourceUrl, headers: headers ?? specHeaders }),
    searchOperations: (service, headers) =>
      searchOperations(service, { datasourceUrl, headers: headers ?? specHeaders }),
  };
};

export const JaegerDatasource: DatasourcePlugin<JaegerDatasourceSpec, JaegerClient> = {
  createClient,
  OptionsEditorComponent: JaegerDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
