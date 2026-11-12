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

func TestAddExemplarLink(t *testing.T) {
	// The order of the options must not matter: enabling exemplars keeps the links already added.
	builder, err := create(
		DirectURL("https://prometheus.demo.do.prometheus.io"),
		AddExemplarLink("Jaeger", "http://localhost:16686/trace/${traceId}", "trace_id"),
		EnableExemplars(),
		AddExemplarLink("", "https://tempo.example.com/trace/${traceId}", "traceID"),
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
	expected := `{"directUrl":"https://prometheus.demo.do.prometheus.io","exemplars":{"enable":true,"links":[` +
		`{"name":"Jaeger","url":"http://localhost:16686/trace/${traceId}","traceIDLabel":"trace_id"},` +
		`{"url":"https://tempo.example.com/trace/${traceId}","traceIDLabel":"traceID"}]}}`
	if string(raw) != expected {
		t.Errorf("serialized spec mismatch:\n got: %s\nwant: %s", raw, expected)
	}

	// The serialized spec must be accepted back.
	var spec PluginSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(spec.Exemplars.Links) != 2 {
		t.Errorf("links mismatch: %v", spec.Exemplars.Links)
	}
}

func TestAddExemplarLinkWithoutEnablingExemplars(t *testing.T) {
	builder, err := create(
		DirectURL("https://prometheus.demo.do.prometheus.io"),
		AddExemplarLink("Jaeger", "http://localhost:16686/trace/${traceId}", "trace_id"),
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if builder.Exemplars == nil || builder.Exemplars.Enable {
		t.Errorf("adding a link should not enable exemplars: %v", builder.Exemplars)
	}
}

func TestInvalidExemplarLink(t *testing.T) {
	if _, err := create(AddExemplarLink("Jaeger", "", "trace_id")); err == nil {
		t.Error("an exemplar link without url should be rejected")
	}
	if _, err := create(AddExemplarLink("Jaeger", "http://localhost:16686/trace/${traceId}", "")); err == nil {
		t.Error("an exemplar link without traceIDLabel should be rejected")
	}

	raw := `{"directUrl":"http://localhost:9090","exemplars":{"enable":true,"links":[{"url":"http://localhost:16686"}]}}`
	var spec PluginSpec
	if err := json.Unmarshal([]byte(raw), &spec); err == nil {
		t.Error("a spec with an exemplar link without traceIDLabel should be rejected")
	}
}
