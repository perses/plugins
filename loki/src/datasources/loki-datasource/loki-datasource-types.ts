import { HTTPProxy } from '@perses-dev/core';

export interface LokiDatasourceSpec {
  directUrl?: string;
  proxy?: HTTPProxy;
}