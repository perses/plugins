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

	"github.com/perses/perses/go-sdk/query"
)

func TestTrinoTraceQueryMarshals(t *testing.T) {
	q, err := query.New(TrinoTraceQuery("SELECT 1", Datasource("trino"), Catalog("iceberg")))
	if err != nil {
		t.Fatal(err)
	}
	if q.Kind != "TraceQuery" {
		t.Fatalf("got kind %s", q.Kind)
	}
	got, err := json.Marshal(q.Spec.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"TrinoTraceQuery","spec":{"datasource":{"kind":"TrinoDatasource","name":"trino"},"query":"SELECT 1","catalog":"iceberg"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
