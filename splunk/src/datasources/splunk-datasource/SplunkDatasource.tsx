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
import {
  SplunkClient,
  createJob,
  getJobStatus,
  getJobResults,
  getJobEvents,
  exportSearch,
  getIndexes,
} from '../../model/splunk-client';
import { SplunkDatasourceSpec } from './splunk-datasource-types';
import { SplunkDatasourceEditor } from './SplunkDatasourceEditor';

const createClient: DatasourcePlugin<SplunkDatasourceSpec, SplunkClient>['createClient'] = (spec, options) => {
  const { directUrl, proxy } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error('No URL specified for Splunk client. You can use directUrl in the spec to configure it.');
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    createJob: (params, headers) => createJob(params, { datasourceUrl, headers: headers ?? specHeaders }),
    getJobStatus: (jobId, headers) => getJobStatus(jobId, { datasourceUrl, headers: headers ?? specHeaders }),
    getJobResults: (jobId, params, headers) =>
      getJobResults(jobId, params, { datasourceUrl, headers: headers ?? specHeaders }),
    getJobEvents: (jobId, params, headers) =>
      getJobEvents(jobId, params, { datasourceUrl, headers: headers ?? specHeaders }),
    exportSearch: (params, headers) => exportSearch(params, { datasourceUrl, headers: headers ?? specHeaders }),
    getIndexes: (headers) => getIndexes({ datasourceUrl, headers: headers ?? specHeaders }),
  };
};

export const SplunkDatasource: DatasourcePlugin<SplunkDatasourceSpec, SplunkClient> = {
  createClient,
  OptionsEditorComponent: SplunkDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
