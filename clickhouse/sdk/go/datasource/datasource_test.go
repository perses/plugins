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

package datasource

import (
	"encoding/json"
	"testing"

	"github.com/perses/perses/go-sdk/datasource"
	"github.com/perses/perses/go-sdk/http"
)

func TestClickHouseSpecMarshalsDatabaseAndProxy(t *testing.T) {
	builder, err := datasource.New("clickhouse", ClickHouse(
		Database("otel"),
		HTTPProxy("http://clickhouse:8123", http.Secret("clickhouse")),
	))
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.Marshal(builder.Spec.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickHouseDatasource","spec":{"proxy":{"kind":"httpproxy","spec":{"url":"http://clickhouse:8123","secret":"clickhouse"}},"database":"otel"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestClickHouseSpecMarshalsDirectURLOnly(t *testing.T) {
	builder, err := datasource.New("clickhouse", ClickHouse(DirectURL("http://localhost:8123")))
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.Marshal(builder.Spec.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickHouseDatasource","spec":{"directUrl":"http://localhost:8123"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
