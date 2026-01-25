// Copyright The Perses Authors
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

export type SQLDriver = 'postgres' | 'mysql' | 'mariadb';

export type SSLMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';

export interface MySQLConfig {
  params?: Record<string, string>;
  maxAllowedPacket?: number;
  timeout?: string;
  readTimeout?: string;
  writeTimeout?: string;
}

export interface PostgresConfig {
  maxConns?: number;
  connectTimeout?: string;
  prepareThreshold?: number;
  sslMode?: SSLMode;
  options?: string;
}

export interface SQLProxySpec {
  // Database driver type
  driver: SQLDriver;

  // Database host (hostname:port)
  host: string;

  // Database name
  database: string;

  // Secret name for credentials and TLS
  secret?: string;

  // MySQL/MariaDB specific config
  mysql?: MySQLConfig;

  // PostgreSQL specific config
  postgres?: PostgresConfig;
}

export interface SQLDatasourceSpec {
  proxy: {
    kind: 'SQLProxy';
    spec: SQLProxySpec;
  };
}

export interface SQLDatasourceClient {
  options: {
    datasourceUrl: string;
  };
}
