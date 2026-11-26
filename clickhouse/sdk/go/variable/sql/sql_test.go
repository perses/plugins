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

package sql

import (
	"encoding/json"
	"testing"

	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
)

func TestClickHouseSQLConfiguresAListVariable(t *testing.T) {
	builder := &listvariable.Builder{}
	err := ClickHouseSQL(
		"SELECT DISTINCT ServiceName FROM otel_traces WHERE $__timeFilter(Timestamp)",
		Datasource("clickhouse"),
	)(builder)
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.Marshal(builder.ListVariableSpec.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickHouseSQLVariable","spec":{"datasource":{"kind":"ClickHouseDatasource","name":"clickhouse"},"query":"SELECT DISTINCT ServiceName FROM otel_traces WHERE $__timeFilter(Timestamp)"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
