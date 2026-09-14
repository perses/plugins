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
)

func TestPrometheusDatasourceBuilder(t *testing.T) {
	builder, err := create(DirectURL("https://prometheus.demo.do.prometheus.io"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if builder.DirectURL != "https://prometheus.demo.do.prometheus.io" {
		t.Errorf("directUrl mismatch: %s", builder.DirectURL)
	}
	if builder.Exemplars != nil {
		t.Errorf("exemplars should not be set: %v", builder.Exemplars)
	}
}

func TestEnableExemplars(t *testing.T) {
	builder, err := create(
		DirectURL("https://prometheus.demo.do.prometheus.io"),
		EnableExemplars(),
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if builder.Exemplars == nil || !builder.Exemplars.Enable {
		t.Fatalf("exemplars should be enabled: %v", builder.Exemplars)
	}

	raw, err := json.Marshal(builder.PluginSpec)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	exemplars, ok := out["exemplars"].(map[string]any)
	if !ok {
		t.Fatalf("exemplars section is missing in the serialized spec: %v", out)
	}
	if enable, ok := exemplars["enable"].(bool); !ok || !enable {
		t.Errorf("exemplars.enable mismatch: %v", exemplars["enable"])
	}
}
