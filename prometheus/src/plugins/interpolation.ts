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

import { DatasourceSelector, DatasourceSpec } from '@perses-dev/core';
import { interpolateHeaders, interpolateQueryParams, VariableStateMap } from '@perses-dev/components';
import { DatasourceStore } from '@perses-dev/plugin-system';
import { ClientRequestOptions, PrometheusClient } from '../model';
import { PrometheusDatasourceSpec } from './types';

export interface ResolvedPrometheusDatasource {
  client: PrometheusClient;
  requestOptions: ClientRequestOptions;
}

export async function resolvePrometheusDatasource(
  datasourceStore: DatasourceStore,
  selector: DatasourceSelector,
  variableState: VariableStateMap
): Promise<ResolvedPrometheusDatasource> {
  const [client, datasource] = await Promise.all([
    datasourceStore.getDatasourceClient<PrometheusClient>(selector),
    datasourceStore.getDatasource(selector) as Promise<DatasourceSpec<PrometheusDatasourceSpec>>,
  ]);
  const { headers, queryParams } = interpolateDatasourceProxyParams(datasource, variableState);
  return { client, requestOptions: { headers, queryParams } };
}

export function interpolateDatasourceProxyParams(
  datasource: DatasourceSpec<PrometheusDatasourceSpec>,
  variableState: VariableStateMap
): ClientRequestOptions {
  const spec = datasource.plugin.spec;
  const rawHeaders = spec.proxy?.spec?.headers;
  const rawQueryParams = spec.queryParams;

  return {
    headers: rawHeaders ? interpolateHeaders(rawHeaders, variableState) : undefined,
    queryParams: rawQueryParams ? interpolateQueryParams(rawQueryParams, variableState) : undefined,
  };
}
