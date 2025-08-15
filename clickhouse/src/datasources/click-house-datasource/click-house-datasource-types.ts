import { HTTPProxy, RequestHeaders } from '@perses-dev/core';
import { DatasourceClient } from '@perses-dev/plugin-system';

export interface ClickHouseDatasourceSpec {
  directUrl?: string;
  proxy?: HTTPProxy;
  username?: string;
  password?: string;
}

interface QueryRequestParameters extends Record<string, string> {
  query: string;
  start: string;
  end: string;
}

interface ClickHouseDatasourceClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface ClickHouseDatasourceResponse {
  status: string;
  warnings?: string[];
  // TODO: adjust this type to match your datasource response shape
  data: any;
};

export interface ClickHouseDatasourceClient extends DatasourceClient {
  options: ClickHouseDatasourceClientOptions;
  query(params: QueryRequestParameters, headers?: RequestHeaders): Promise<ClickHouseDatasourceResponse>;
}