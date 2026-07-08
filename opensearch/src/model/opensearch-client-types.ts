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

export type OpenSearchRequestHeaders = Record<string, string>;

export interface OpenSearchPPLColumn {
  name: string;
  type: string;
}

export interface OpenSearchPPLResponse {
  schema: OpenSearchPPLColumn[];
  datarows: Array<Array<string | number | boolean | null>>;
  total?: number;
  size?: number;
}

export interface OpenSearchErrorResponse {
  error?: {
    type?: string;
    reason?: string;
    details?: string;
  };
  status?: number;
}
