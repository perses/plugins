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

package model

import (
	"strings"
	ds "github.com/perses/plugins/clickhouse/schemas/datasources/click-house-datasource:model"
)

kind: "ClickHouseTraceQuery"
spec: close({
	ds.#selector

	// A trace ID, to read a trace, or a query returning the "TraceId" and "Timestamp" columns of the spans to
	// search for. Both can come from variables.
	query: strings.MinRunes(1)
	// Table of the spans, in the schema of the OpenTelemetry Collector: "table" or "database.table".
	// Defaults to "otel_traces".
	table?: =~"^[A-Za-z_][A-Za-z0-9_]*(\\.[A-Za-z_][A-Za-z0-9_]*)?$"
	// Maximum number of traces returned by a search. Defaults to 20.
	limit?: int & >=1
})
