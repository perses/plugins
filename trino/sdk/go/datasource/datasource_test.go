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
)

func TestTrinoSpecMarshalsUser(t *testing.T) {
	builder, err := datasource.New("trino", Trino(DirectURL("http://trino:8080"), User("perses")))
	if err != nil {
		t.Fatal(err)
	}
	got, err := json.Marshal(builder.Spec.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"TrinoDatasource","spec":{"directUrl":"http://trino:8080","user":"perses"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
