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
  PyroscopeClient,
  searchProfiles,
  searchProfileTypes,
  searchLabelNames,
  searchLabelValues,
  searchServices,
} from '../model/pyroscope-client';
import { PyroscopeDatasourceSpec } from './pyroscope-datasource-types';
import { PyroscopeDatasourceEditor } from './PyroscopeDatasourceEditor';

/**
 * Creates a PyroscopeClient for a specific datasource spec.
 */
const createClient: DatasourcePlugin<PyroscopeDatasourceSpec, PyroscopeClient>['createClient'] = (spec, options) => {
  const { directUrl, proxy } = spec;
  const { proxyUrl } = options;

  // Use the direct URL if specified, but fallback to the proxyUrl by default if not specified
  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error('No URL specified for Pyroscope client. You can use directUrl in the spec to configure it.');
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    searchProfiles: (params, headers) => searchProfiles(params, { datasourceUrl, headers: headers ?? specHeaders }),
    searchProfileTypes: (params, headers, body) =>
      searchProfileTypes(params, { datasourceUrl, headers: headers ?? specHeaders }, body),
    searchLabelNames: (params, headers, body) =>
      searchLabelNames(params, { datasourceUrl, headers: headers ?? specHeaders }, body),
    searchLabelValues: (params, headers, body) =>
      searchLabelValues(params, { datasourceUrl, headers: headers ?? specHeaders }, body),
    searchServices: (params, headers) => searchServices(params, { datasourceUrl, headers: headers ?? specHeaders }),
  };
};

export const PyroscopeDatasource: DatasourcePlugin<PyroscopeDatasourceSpec, PyroscopeClient> = {
  createClient,
  OptionsEditorComponent: PyroscopeDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};
