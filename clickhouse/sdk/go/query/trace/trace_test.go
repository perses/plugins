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

package trace

import (
	"encoding/json"
	"testing"

	"github.com/perses/spec/go/plugin"
)

func TestClickHouseTraceQueryMarshalsItsOptions(t *testing.T) {
	option := ClickHouseTraceQuery(
		"SELECT TraceId, Timestamp FROM otel_traces WHERE StatusCode = 'Error'",
		Datasource("clickhouse"),
		Table("otel.otel_traces"),
		Limit(50),
	)
	if option.Error != nil {
		t.Fatal(option.Error)
	}
	if option.Kind != plugin.KindTraceQuery {
		t.Fatalf("got kind %s, want %s", option.Kind, plugin.KindTraceQuery)
	}
	got, err := json.Marshal(option.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickHouseTraceQuery","spec":{"datasource":{"kind":"ClickHouseDatasource","name":"clickhouse"},"query":"SELECT TraceId, Timestamp FROM otel_traces WHERE StatusCode = 'Error'","table":"otel.otel_traces","limit":50}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestClickHouseTraceQueryRejectsInvalidOptions(t *testing.T) {
	if err := ClickHouseTraceQuery("$traceId", Table("otel_traces WHERE 1 = 1")).Error; err == nil {
		t.Fatal("expected an error for a table that is not a table name")
	}
	if err := ClickHouseTraceQuery("$traceId", Limit(0)).Error; err == nil {
		t.Fatal("expected an error for a limit that is not positive")
	}
}
