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
 * buildUrl returns the URL of a path of a datasource. A relative datasource URL is the one of the Perses proxy: it
 * is resolved against the origin of the page.
 */
export function buildUrl(datasourceUrl: string, path = ''): URL {
  const url = new URL(datasourceUrl, window.location.origin);
  if (path) {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}${path}`;
  }
  return url;
}
