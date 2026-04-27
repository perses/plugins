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

import { OpenSearchPPLResponse, OpenSearchRequestHeaders } from './opensearch-client-types';

export interface OpenSearchPPLParams {
  query: string;
}

export interface OpenSearchApiOptions {
  datasourceUrl: string;
  headers?: OpenSearchRequestHeaders;
}

export interface OpenSearchClient {
  options: {
    datasourceUrl: string;
  };
  ppl: (params: OpenSearchPPLParams, headers?: OpenSearchRequestHeaders) => Promise<OpenSearchPPLResponse>;
}

export class OpenSearchPPLError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string
  ) {
    super(message ?? `OpenSearch PPL request failed (${status}): ${body}`);
    this.name = 'OpenSearchPPLError';
  }
}

function buildUrl(path: string, datasourceUrl: string): URL {
  if (datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')) {
    return new URL(path, datasourceUrl);
  }

  let fullPath: string;
  if (datasourceUrl.endsWith('/') && path.startsWith('/')) {
    fullPath = datasourceUrl + path.slice(1);
  } else if (!datasourceUrl.endsWith('/') && !path.startsWith('/')) {
    fullPath = datasourceUrl + '/' + path;
  } else {
    fullPath = datasourceUrl + path;
  }

  return new URL(fullPath, window.location.origin);
}

export async function ppl(params: OpenSearchPPLParams, options: OpenSearchApiOptions): Promise<OpenSearchPPLResponse> {
  const url = buildUrl('/_plugins/_ppl', options.datasourceUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify({ query: params.query }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new OpenSearchPPLError(response.status, body);
  }

  return response.json();
}
