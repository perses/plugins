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

import { StatusError } from '@perses-dev/core';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  SearchLabelNamesResponse,
  SearchLabelValuesResponse,
  SearchProfileTypesResponse,
  PyroscopeClient,
} from '../model';

export function useLabelNames(
  client: PyroscopeClient | undefined
): UseQueryResult<SearchLabelNamesResponse, StatusError> {
  return useQuery<SearchLabelNamesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchLabelNames', 'client', client],
    queryFn: async () => {
      return await client!.searchLabelNames({}, { 'content-type': 'application/json' }, {});
    },
  });
}

export function useLabelValues(
  client: PyroscopeClient | undefined,
  labelName: string
): UseQueryResult<SearchLabelValuesResponse, StatusError> {
  return useQuery<SearchLabelValuesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchLabelValues', 'client', client, labelName],
    queryFn: async () => {
      return await client!.searchLabelValues({}, { 'content-type': 'application/json' }, { name: labelName });
    },
  });
}

export function useProfileTypes(
  client: PyroscopeClient | undefined
): UseQueryResult<SearchProfileTypesResponse, StatusError> {
  return useQuery<SearchProfileTypesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchProfileTypes', 'client', client],
    queryFn: async () => {
      return await client!.searchProfileTypes({}, { 'content-type': 'application/json' }, {});
    },
  });
}

export function useServices(
  client: PyroscopeClient | undefined
): UseQueryResult<SearchLabelValuesResponse, StatusError> {
  return useQuery<SearchLabelValuesResponse, StatusError>({
    enabled: !!client,
    queryKey: ['searchServices', 'client', client],
    queryFn: async () => {
      return await client!.searchServices({}, { 'content-type': 'application/json' });
    },
  });
}
