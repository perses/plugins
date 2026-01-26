// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { VariableOption, useDatasourceClient, useTimeRange } from '@perses-dev/plugin-system';
import { AbsoluteTimeRange, DatasourceSelector, StatusError } from '@perses-dev/core';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  VictoriaLogsClient,
  VictoriaLogsFieldItem,
  VictoriaLogsFieldNamesResponse,
  VictoriaLogsFieldValuesResponse,
} from '../model';

export const fieldItemsToVariableOptions = (values?: VictoriaLogsFieldItem[]): VariableOption[] => {
  if (!values) return [];
  return values.map((value) => ({
    value: value.value,
    label: value.value,
  }));
};

export function getVictoriaLogsTimeRange(timeRange: AbsoluteTimeRange): { start: string; end: string } {
  const { start, end } = timeRange;
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function useFieldNames(
  query: string,
  datasource: DatasourceSelector
): UseQueryResult<VictoriaLogsFieldNamesResponse, StatusError> {
  const {
    absoluteTimeRange: { start, end },
  } = useTimeRange();
  const { data: client } = useDatasourceClient<VictoriaLogsClient>(datasource);
  const enabled = !!client && !!query;

  return useQuery<VictoriaLogsFieldNamesResponse, StatusError>({
    enabled: enabled,
    queryKey: ['datasource', datasource.name, 'query', query],
    queryFn: async () => {
      return await client!.fieldNames({
        start: start.toISOString(),
        end: end.toISOString(),
        query: query,
      });
    },
  });
}

export function useFieldValues(
  field: string,
  query: string,
  datasource: DatasourceSelector
): UseQueryResult<VictoriaLogsFieldValuesResponse, StatusError> {
  const {
    absoluteTimeRange: { start, end },
  } = useTimeRange();
  const { data: client } = useDatasourceClient<VictoriaLogsClient>(datasource);
  const enabled = !!client && !!query;

  return useQuery<VictoriaLogsFieldValuesResponse, StatusError>({
    enabled: enabled,
    queryKey: ['field', field, 'datasource', datasource.name, 'query', query],
    queryFn: async () => {
      return await client!.fieldValues({
        query: query,
        field: field,
        start: start.toISOString(),
        end: end.toISOString(),
      });
    },
  });
}
