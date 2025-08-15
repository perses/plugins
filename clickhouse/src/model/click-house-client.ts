export interface ClickHouseQueryResponse {
  status: 'success' | 'error';
  data: any;
}

export interface ClickHouseClient {
  query: (params: { start: string; end: string; query: string }) => Promise<ClickHouseQueryResponse>;
}
