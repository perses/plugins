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

import { StatusError } from '@perses-dev/client';
import { useDatasourceClient, useDatasourceStore, useVariableValues } from '@perses-dev/plugin-system';
import { DatasourceSelector } from '@perses-dev/spec';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

import {
  InstantQueryRequestParameters,
  MonitoredInstantQueryResponse,
  ParseQueryRequestParameters,
  ParseQueryResponse,
  PrometheusClient,
} from '../model';
import { getInterpolatedRequestOptions } from '../plugins/interpolation';

export function useParseQuery(
  content: string,
  datasource: DatasourceSelector,
  enabled?: boolean
): UseQueryResult<ParseQueryResponse, StatusError> {
  const { data: client } = useDatasourceClient<PrometheusClient>(datasource);
  const datasourceStore = useDatasourceStore();
  const variableState = useVariableValues();

  return useQuery<ParseQueryResponse, StatusError>({
    enabled: !!client && enabled,
    queryKey: ['parseQuery', content, 'datasource', datasource],
    queryFn: async () => {
      const params: ParseQueryRequestParameters = { query: content };

      const interpolatedOptions = await getInterpolatedRequestOptions(datasourceStore, datasource, variableState);

      return await client!.parseQuery(params, interpolatedOptions);
    },
  });
}

export function useInstantQuery(
  content: string,
  datasource: DatasourceSelector,
  enabled?: boolean
): UseQueryResult<MonitoredInstantQueryResponse, StatusError> {
  const { data: client } = useDatasourceClient<PrometheusClient>(datasource);
  const datasourceStore = useDatasourceStore();
  const variableState = useVariableValues();

  return useQuery<MonitoredInstantQueryResponse, StatusError>({
    enabled: !!client && enabled,
    // TODO: for some reason the caching is not working: identical nodes still fire their requests after each change made to the promQL
    queryKey: ['instantQuery', content, 'datasource', datasource.kind],
    queryFn: async () => {
      const params: InstantQueryRequestParameters = { query: content };

      const interpolatedOptions = await getInterpolatedRequestOptions(datasourceStore, datasource, variableState);

      const startTime = performance.now();
      const response = await client!.instantQuery(params, interpolatedOptions);
      const responseTime = performance.now() - startTime;

      return { ...response, responseTime };
    },
  });
}
