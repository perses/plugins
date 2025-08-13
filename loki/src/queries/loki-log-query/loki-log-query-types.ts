import { DatasourceSelector } from '@perses-dev/core';
import { LokiQueryRangeStreamsResponse } from '../../model/loki-client-types';

export interface LokiLogQuerySpec {
  query: string;
  datasource?: DatasourceSelector;
  direction?: 'backward' | 'forward';
}

export type LokiLogQueryResponse = LokiQueryRangeStreamsResponse;
