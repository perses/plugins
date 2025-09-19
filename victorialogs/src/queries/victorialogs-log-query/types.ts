import { DatasourceSelector } from '@perses-dev/core';

export interface VictoriaLogsLogQuerySpec {
  query: string;
  datasource?: DatasourceSelector;
}
