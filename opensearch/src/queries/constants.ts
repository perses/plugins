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

import type { OpenSearchQueryLanguage } from './opensearch-log-query/opensearch-log-query-types';

export const DATASOURCE_KIND = 'OpenSearchDatasource';
export const DEFAULT_DATASOURCE = { kind: DATASOURCE_KIND };

// Default field names inside OpenSearch log documents. OpenSearch doesn't enforce a schema,
// so these are used as reasonable fallbacks when mapping rows to log entries.
export const DEFAULT_TIMESTAMP_FIELDS = ['@timestamp', 'timestamp', 'time'];
export const DEFAULT_MESSAGE_FIELDS = ['message', 'log', 'body'];

export interface LanguageMeta {
  label: string;
  docsUrl: string;
  docsLabel: string;
  placeholder: string;
  examples: string;
  indexHelperText: string;
  usageNote: string;
}

/**
 * Single source of truth for the editor's language dropdown and every piece of
 * language-specific copy. Adding a language is one entry here plus a `case` in the
 * dispatcher.
 */
export const QUERY_LANGUAGES: Record<OpenSearchQueryLanguage, LanguageMeta> = {
  ppl: {
    label: 'PPL',
    docsUrl: 'https://docs.opensearch.org/latest/sql-and-ppl/ppl/index/',
    docsLabel: 'PPL',
    placeholder: 'e.g. source=logs-* | where level="error"',
    examples: `source=logs-* | where level="error" | head 20
source=logs-* | fields @timestamp, service, message | head 50
source=logs-* | stats count() by service
source=logs-* | where traceId='$traceId'`,
    indexHelperText: 'Ignored when the PPL query starts with source=.',
    usageNote: 'Requires the SQL/PPL plugin enabled on the OpenSearch cluster.',
  },
  sql: {
    label: 'SQL',
    docsUrl: 'https://docs.opensearch.org/latest/sql-and-ppl/sql/index/',
    docsLabel: 'SQL',
    placeholder: "e.g. SELECT @timestamp, message FROM `logs-*` WHERE level = 'error'",
    examples: `SELECT @timestamp, message, level FROM \`logs-*\` WHERE level = 'error' LIMIT 20
SELECT service, COUNT(*) FROM \`logs-*\` GROUP BY service
SELECT * FROM \`otel-logs-*\` WHERE traceId = '$traceId' LIMIT 50`,
    indexHelperText: 'Ignored — the index comes from the FROM clause of your SQL.',
    usageNote: 'Requires the SQL/PPL plugin enabled on the OpenSearch cluster.',
  },
  lucene: {
    label: 'Lucene',
    docsUrl: 'https://docs.opensearch.org/latest/query-dsl/full-text/query-string/',
    docsLabel: 'query string',
    placeholder: 'e.g. level:error AND service:api',
    examples: `level:error AND service:api
message:"connection refused"
status:[500 TO 599]
traceId:$traceId
NOT level:debug`,
    indexHelperText: 'Required. Sent as the index in POST /{index}/_search.',
    usageNote: 'The dashboard time range is added to your query automatically.',
  },
  dsl: {
    label: 'Query DSL',
    docsUrl: 'https://docs.opensearch.org/latest/query-dsl/',
    docsLabel: 'Query DSL',
    placeholder: 'e.g. {"query": {"match": {"level": "error"}}}',
    examples: `{"query": {"match": {"level": "error"}}}
{"query": {"bool": {"must_not": [{"term": {"level": "debug"}}]}}}
{"size": 100, "query": {"term": {"traceId": "$traceId"}}}`,
    indexHelperText: 'Required. Sent as the index in POST /{index}/_search.',
    usageNote: 'The dashboard time range is added to your query automatically.',
  },
};

// `_search` returns only 10 hits by default, which would silently truncate a log panel
// to ten lines. 500 matches the log default used by Grafana's OpenSearch datasource.
export const DEFAULT_SEARCH_SIZE = 500;
