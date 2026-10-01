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

export interface OpenSearchDatarowsColumn {
  name: string;
  type: string;
}

/** The schema + datarows shape returned by _ppl and _sql. OpenSearch calls this its `jdbc` response format (?format=jdbc), which is the default. */
export interface OpenSearchDatarowsResponse {
  schema: OpenSearchDatarowsColumn[];
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

export interface OpenSearchSearchHit {
  _index?: string;
  _id?: string;
  _source?: Record<string, unknown>;
}

export interface OpenSearchSearchResponse {
  hits: {
    /** Absent when the request sets `track_total_hits: false`. */
    total?: { value: number; relation: 'eq' | 'gte' };
    hits: OpenSearchSearchHit[];
  };
}

/** A `_search` request body. Kept loose so a user-supplied Query DSL body passes through unchanged. */
export type OpenSearchSearchRequestBody = Record<string, unknown>;
