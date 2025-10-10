import { VictoriaLogsClient, VictoriaLogsFieldItem, VictoriaLogsFieldNamesResponse, VictoriaLogsFieldValuesResponse } from '../model';
import { VariableOption, useDatasourceClient, useTimeRange } from '@perses-dev/plugin-system';
import { AbsoluteTimeRange, DatasourceSelector, StatusError } from '@perses-dev/core'
import { useQuery, UseQueryResult } from '@tanstack/react-query';

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
