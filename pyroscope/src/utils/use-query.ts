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

import { useDatasourceClient } from '@perses-dev/plugin-system';
import { DatasourceSelector, StatusError } from '@perses-dev/core';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  SearchLabelNamesResponse,
  SearchLabelValuesResponse,
  SearchProfileTypesResponse,
  PyroscopeClient,
} from '../model';

export function useLabelNames(datasource: DatasourceSelector): UseQueryResult<SearchLabelNamesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);

  return useQuery<SearchLabelNamesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchLabelNames', 'datasource', datasource],
    queryFn: async () => {
      return await client!.searchLabelNames({}, { 'content-type': 'application/json' }, {});
    },
  });
}

export function useLabelValues(
  datasource: DatasourceSelector,
  labelName: string
): UseQueryResult<SearchLabelValuesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);

  return useQuery<SearchLabelValuesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchLabelValues', labelName, 'datasource', datasource],
    queryFn: async () => {
      return await client!.searchLabelValues({}, { 'content-type': 'application/json' }, { name: labelName });
    },
  });
}

export function useProfileTypes(
  datasource: DatasourceSelector
): UseQueryResult<SearchProfileTypesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);

  return useQuery<SearchProfileTypesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchProfileTypes', 'datasource', datasource],
    queryFn: async () => {
      return await client!.searchProfileTypes({}, { 'content-type': 'application/json' }, {});
    },
  });
}

export function useServices(datasource: DatasourceSelector): UseQueryResult<SearchLabelValuesResponse, StatusError> {
  const { data: client } = useDatasourceClient<PyroscopeClient>(datasource);

  return useQuery<SearchLabelValuesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchServices', 'datasource', datasource],
    queryFn: async () => {
      return await client!.searchServices({}, { 'content-type': 'application/json' });
    },
  });
}

export function filterLabelNamesOptions(labelNamesOptions: string[]): string[] {
  const regex = /^__.*__$/;
  return labelNamesOptions.filter((labelName) => !regex.test(labelName) && labelName !== 'service_name');
}
