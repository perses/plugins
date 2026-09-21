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

/**
 * Builds a request URL by combining the datasource base URL, endpoint path, and optional query parameters.
 * @param datasourceUrl Base datasource URL.
 * @param endpointUrl Endpoint path, with or without a leading slash.
 * @param queryParams Optional query parameters to append.
 * @returns The fully qualified request URL.
 */
export function buildUrl(datasourceUrl: string, endpointUrl: string, queryParams?: Record<string, string>): string {
  const base = datasourceUrl.replace(/\/$/, '');
  const path = endpointUrl.startsWith('/') ? endpointUrl : `/${endpointUrl}`;
  const combined = `${base}${path}`;

  const query = new URLSearchParams(queryParams).toString();
  if (!query) {
    return combined;
  }

  // Use '&' when the path already contains a query string, otherwise start one with '?'.
  const separator = combined.includes('?') ? '&' : '?';
  return `${combined}${separator}${query}`;
}
