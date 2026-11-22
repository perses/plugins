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

package variable

import (
	"encoding/json"
	"testing"

	"github.com/perses/perses/go-sdk/variable"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
	"github.com/perses/spec/go/dashboard"
)

func TestTrinoSQLVariableMarshals(t *testing.T) {
	builder, err := variable.New("region", listvariable.List(TrinoSQL("SELECT DISTINCT region FROM hosts", Datasource("trino"), Schema("ops"))))
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.Marshal(builder.Variable.Spec.Spec.(dashboard.ListVariableSpec).Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"TrinoSQLVariable","spec":{"datasource":{"kind":"TrinoDatasource","name":"trino"},"query":"SELECT DISTINCT region FROM hosts","schema":"ops"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
