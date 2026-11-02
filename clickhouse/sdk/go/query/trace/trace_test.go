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

func TestClickHouseTraceQueryBuilder(t *testing.T) {
	q := ClickHouseTraceQuery(
		"SELECT * FROM otel.otel_traces",
		Datasource("clickhouse"),
		Table("otel.otel_traces"),
		Limit(50),
	)
	if q.Error != nil {
		t.Fatalf("unexpected error: %v", q.Error)
	}
	if q.Kind != plugin.KindTraceQuery {
		t.Fatalf("unexpected query kind: %s", q.Kind)
	}
	if q.Plugin.Kind != PluginKind {
		t.Fatalf("unexpected plugin kind: %s", q.Plugin.Kind)
	}

	raw, err := json.Marshal(q.Plugin.Spec)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if out["query"] != "SELECT * FROM otel.otel_traces" {
		t.Errorf("query mismatch: %v", out["query"])
	}
	if out["table"] != "otel.otel_traces" {
		t.Errorf("table mismatch: %v", out["table"])
	}
	if out["limit"] != float64(50) {
		t.Errorf("limit mismatch: %v", out["limit"])
	}
	datasource, ok := out["datasource"].(map[string]any)
	if !ok || datasource["kind"] != "ClickHouseDatasource" || datasource["name"] != "clickhouse" {
		t.Errorf("datasource mismatch: %v", out["datasource"])
	}
}

func TestClickHouseTraceQueryOmitsEmptyOptionalFields(t *testing.T) {
	q := ClickHouseTraceQuery("5b8efff798038103d269b633813fc60c")
	raw, err := json.Marshal(q.Plugin.Spec)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	for _, f := range []string{"datasource", "table", "limit"} {
		if _, present := out[f]; present {
			t.Errorf("expected %s to be omitted, got: %v", f, out[f])
		}
	}
}
