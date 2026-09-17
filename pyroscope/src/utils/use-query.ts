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

import type { StatusError } from '@perses-dev/client';
import { useDatasourceClient, useTimeRange } from '@perses-dev/plugin-system';
import type { DatasourceSelector } from '@perses-dev/spec';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type {
  SearchLabelNamesResponse,
  SearchLabelValuesResponse,
  SearchProfileTypesResponse,
  PyroscopeClient,
} from '../model';
import { getUnixTimeRange } from '../plugins';

// Pyroscope need timestamp in milliseconds, but the time range from Perses is in seconds.
const MILLISECONDS = 1_000;

export function useLabelNames(datasource: DatasourceSelector): UseQueryResult<SearchLabelNamesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);
  const { absoluteTimeRange } = useTimeRange();
  const { start, end } = getUnixTimeRange(absoluteTimeRange);

  return useQuery<SearchLabelNamesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchLabelNames', client],
    queryFn: async () => {
      return await client!.searchLabelNames(
        {},
        { 'content-type': 'application/json' },
        { start: start * MILLISECONDS, end: end * MILLISECONDS },
      );
    },
  });
}

export function useLabelValues(
  datasource: DatasourceSelector,
  labelName: string,
): UseQueryResult<SearchLabelValuesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);
  const { absoluteTimeRange } = useTimeRange();
  const { start, end } = getUnixTimeRange(absoluteTimeRange);

  return useQuery<SearchLabelValuesResponse, StatusError>({
    enabled: !!client && labelName !== '', // do not trigger query if no labelName is set
    queryKey: ['searchLabelValues', labelName, client],
    queryFn: async () => {
      return await client!.searchLabelValues(
        {},
        { 'content-type': 'application/json' },
        { name: labelName, start: start * MILLISECONDS, end: end * MILLISECONDS },
      );
    },
  });
}

export function useProfileTypes(
  datasource: DatasourceSelector,
  service?: string,
): UseQueryResult<SearchProfileTypesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);
  const { absoluteTimeRange } = useTimeRange();
  const { start, end } = getUnixTimeRange(absoluteTimeRange);

  return useQuery<SearchProfileTypesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchProfileTypes', service, client],
    queryFn: async () => {
      const profileTypesResponse = await client!.searchProfileTypes(
        {},
        { 'content-type': 'application/json' },
        { start: start * MILLISECONDS, end: end * MILLISECONDS },
      );

      // if a service name is given, narrow profile types list to only the existing ones for this service
      // otherwise return all existing profile types on the server
      if (!service) {
        return profileTypesResponse;
      }

      const labelValuesResponse = await client!.searchLabelValues(
        {},
        { 'content-type': 'application/json' },
        {
          name: '__name__',
          matchers: [`{service_name="${service}"}`],
          start: start * MILLISECONDS,
          end: end * MILLISECONDS,
        },
      );
      const profileTypeNames = new Set(labelValuesResponse.names);

      return {
        profileTypes: profileTypesResponse.profileTypes.filter((profileType) => profileTypeNames.has(profileType.name)),
      };
    },
  });
}

export function useServices(datasource: DatasourceSelector): UseQueryResult<SearchLabelValuesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);
  const { absoluteTimeRange } = useTimeRange();
  const { start, end } = getUnixTimeRange(absoluteTimeRange);

  return useQuery<SearchLabelValuesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchServices', client],
    queryFn: async () => {
      return await client!.searchServices(
        {},
        { 'content-type': 'application/json' },
        { start: start * MILLISECONDS, end: end * MILLISECONDS },
      );
    },
  });
}

export function filterLabelNamesOptions(labelNamesOptions: string[]): string[] {
  const regex = /^__.*__$/;
  return labelNamesOptions.filter((labelName) => !regex.test(labelName) && labelName !== 'service_name');
}
