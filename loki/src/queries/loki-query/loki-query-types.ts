import { DatasourceSelector } from '@perses-dev/core';
import { LokiQueryRangeResponse, LokiQueryResponse } from '../../model/loki-client-types';

export interface LokiQuerySpec {
  query: string;
  datasource?: DatasourceSelector;
}

export type DatasourceQueryResponse = LokiQueryRangeResponse