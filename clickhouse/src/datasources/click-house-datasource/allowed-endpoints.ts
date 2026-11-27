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

import type { HTTPAllowedEndpoint } from '@perses-dev/spec';

const QUERY_PATH = '/';
/** Path of the connection test, which Perses calls with GET. */
export const HEALTH_CHECK_PATH = '/ping';

function allows(endpoint: HTTPAllowedEndpoint, method: string, path: string): boolean {
  if (endpoint.method.toUpperCase() !== method) return false;
  try {
    return new RegExp(endpoint.endpointPattern).test(path);
  } catch {
    // The pattern is a Go regular expression: when JavaScript can not read it, let the proxy decide.
    return true;
  }
}

function allowsQueries(endpoint: HTTPAllowedEndpoint, method: string): boolean {
  return allows(endpoint, method, QUERY_PATH);
}

/**
 * allowsConnectionTest reports whether a proxy lets the connection test through. The datasources created before it
 * existed only allow the queries.
 */
export function allowsConnectionTest(allowedEndpoints: HTTPAllowedEndpoint[] | undefined): boolean {
  if (!allowedEndpoints || allowedEndpoints.length === 0) return true;
  return allowedEndpoints.some((endpoint) => allows(endpoint, 'GET', HEALTH_CHECK_PATH));
}

/**
 * getQueryMethod picks the HTTP method of the queries. They are sent with POST, which has no size limit, unless the
 * proxy of the datasource only lets GET requests through, as the datasources created before POST was used do.
 */
export function getQueryMethod(allowedEndpoints: HTTPAllowedEndpoint[] | undefined): 'GET' | 'POST' {
  if (!allowedEndpoints || allowedEndpoints.length === 0) return 'POST';
  if (allowedEndpoints.some((endpoint) => allowsQueries(endpoint, 'POST'))) return 'POST';
  return allowedEndpoints.some((endpoint) => allowsQueries(endpoint, 'GET')) ? 'GET' : 'POST';
}
