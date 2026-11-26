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

	"github.com/perses/perses/go-sdk/annotation"
)

func TestClickHouseSQLConfiguresAnAnnotation(t *testing.T) {
	builder, err := annotation.New("Deployments", ClickHouseSQL(
		"SELECT deployed_at AS time, version AS title FROM deployments WHERE $__timeFilter(deployed_at)",
		Datasource("clickhouse"),
	))
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.Marshal(builder.Annotation.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickHouseSQLAnnotation","spec":{"datasource":{"kind":"ClickHouseDatasource","name":"clickhouse"},"query":"SELECT deployed_at AS time, version AS title FROM deployments WHERE $__timeFilter(deployed_at)"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
