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
  LokiClient,
  query,
  queryRange,
  labels,
  labelValues,
  series,
  volume,
  volumeRange,
  indexStats,
} from '../../model/loki-client';
import { LokiDatasourceSpec } from './loki-datasource-types';
import { LokiDatasourceEditor } from './LokiDatasourceEditor';

const createClient: DatasourcePlugin<LokiDatasourceSpec, LokiClient>['createClient'] = (spec, options) => {
  const { directUrl, proxy } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error('No URL specified for Loki client. You can use directUrl in the spec to configure it.');
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    query: (params, headers) => query(params, { datasourceUrl, headers: headers ?? specHeaders }),
    queryRange: (params, headers) => queryRange(params, { datasourceUrl, headers: headers ?? specHeaders }),
    labels: (start, end, headers) => labels(start, end, { datasourceUrl, headers: headers ?? specHeaders }),
    labelValues: (label, start, end, headers) =>
      labelValues(label, start, end, { datasourceUrl, headers: headers ?? specHeaders }),
    series: (match, start, end, headers) =>
      series(match, start, end, { datasourceUrl, headers: headers ?? specHeaders }),
    volume: (params, headers) => volume(params, { datasourceUrl, headers: headers ?? specHeaders }),
    volumeRange: (params, headers) => volumeRange(params, { datasourceUrl, headers: headers ?? specHeaders }),
    indexStats: (query, start, end, headers) =>
      indexStats(query, start, end, { datasourceUrl, headers: headers ?? specHeaders }),
  };
};

export const LokiDatasource: DatasourcePlugin<LokiDatasourceSpec, LokiClient> = {
  createClient,
  OptionsEditorComponent: LokiDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
