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

package alerts

import (
	"encoding/json"
	"testing"

	"github.com/perses/spec/go/plugin"
)

func TestAlertsQueryMarshalsItsFilters(t *testing.T) {
	option := AlertsQuery(
		Datasource("clickstack"),
		States(StateAlert, StatePending, StateOK),
		Sources(SourceTile),
		Tags("team:$team", "production"),
		Search("checkout"),
	)
	if option.Error != nil {
		t.Fatal(option.Error)
	}
	if option.Kind != plugin.KindAlertsQuery {
		t.Fatalf("got kind %s, want %s", option.Kind, plugin.KindAlertsQuery)
	}
	got, err := json.Marshal(option.Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickStackAlertsQuery","spec":{"datasource":{"kind":"ClickStackDatasource","name":"clickstack"},"states":["ALERT","PENDING","OK"],"sources":["tile"],"tags":["team:$team","production"],"search":"checkout"}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestAlertsQueryWithoutOptionsIsEmpty(t *testing.T) {
	got, err := json.Marshal(AlertsQuery().Plugin)
	if err != nil {
		t.Fatal(err)
	}
	want := `{"kind":"ClickStackAlertsQuery","spec":{}}`
	if string(got) != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestAlertsQueryRejectsUnknownValues(t *testing.T) {
	if err := AlertsQuery(States("firing")).Error; err == nil {
		t.Fatal("expected an error for an unknown state")
	}
	if err := AlertsQuery(Sources("dashboard")).Error; err == nil {
		t.Fatal("expected an error for an unknown source")
	}
}
