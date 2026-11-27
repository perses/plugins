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

import type { ClickHouseQuerySpec } from '../../model/execute-query';

/** Table of the spans written by the ClickHouse exporter of the OpenTelemetry Collector. */
export const DEFAULT_TRACE_TABLE = 'otel_traces';

/** Number of traces returned by a search when the query does not set a limit. */
export const DEFAULT_SEARCH_LIMIT = 20;

export interface ClickHouseTraceQuerySpec extends ClickHouseQuerySpec {
  /**
   * Table holding the spans, optionally qualified by its database. It follows the schema of the ClickHouse exporter
   * of the OpenTelemetry Collector. Defaults to `otel_traces`.
   */
  table?: string;
  /** Maximum number of traces returned by a search. Defaults to 20. */
  limit?: number;
}
