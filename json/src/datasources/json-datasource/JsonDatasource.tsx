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

import { fetch } from "@perses-dev/client";
import { DatasourcePlugin } from "@perses-dev/plugin-system";
import { JsonDatasourceClient, JsonDatasourceSpec } from "./json-datasource-types";
import { JsonDatasourceEditor } from "./JsonDatasourceEditor";
import { buildUrl } from "./json-datasource-utils";

const createClient: DatasourcePlugin<JsonDatasourceSpec, JsonDatasourceClient>['createClient'] = (spec, options) => {
  const { directUrl, proxy } = spec;
  const { proxyUrl } = options;

  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error('No URL specified for JsonDatasource client. You can use directUrl in the spec to configure it.');
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    query: async (params, headers) => {
      const { endpointUrl, method, queryParams, body } = params;
      const url = buildUrl(datasourceUrl, endpointUrl, queryParams);

      const resolvedHeaders = headers ?? specHeaders;
      const requestHeaders =
        method === 'POST' && body
          ? { 'Content-Type': 'application/json', ...resolvedHeaders }
          : resolvedHeaders;

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body,
      });

      return await response.json();
    },
  };
};

export const JsonDatasource: DatasourcePlugin<JsonDatasourceSpec, JsonDatasourceClient> = {
  createClient,
  OptionsEditorComponent: JsonDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
