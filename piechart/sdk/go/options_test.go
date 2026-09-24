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

package pie

import (
	"encoding/json"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestVisualOuterRadiusDefaultsToOneHundredPercent(t *testing.T) {
	builder, err := create()
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	if builder.Visual.OuterRadius != 100 {
		t.Errorf("expected default outer radius to be 100, got %d", builder.Visual.OuterRadius)
	}
}

func TestWithVisualPreservesZeroOuterRadius(t *testing.T) {
	builder, err := create(WithVisual(Visual{OuterRadius: 0}))
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	if builder.Visual.OuterRadius != 0 {
		t.Errorf("expected outer radius to remain zero, got %d", builder.Visual.OuterRadius)
	}
}

func TestWithVisualSerializesPieOptions(t *testing.T) {
	builder, err := create(WithVisual(Visual{
		InnerRadius:  40,
		OuterRadius:  90,
		ColorPalette: []string{"#3366cc", "#dc3912"},
	}))
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	bytes, err := json.Marshal(builder)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(bytes, &result); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	visual, ok := result["visual"].(map[string]any)
	if !ok {
		t.Fatalf("expected visual options, got %#v", result["visual"])
	}
	if visual["innerRadius"] != float64(40) || visual["outerRadius"] != float64(90) {
		t.Errorf("unexpected radii: %#v", visual)
	}
	colorPalette, ok := visual["colorPalette"].([]any)
	if !ok || len(colorPalette) != 2 || colorPalette[0] != "#3366cc" || colorPalette[1] != "#dc3912" {
		t.Errorf("unexpected color palette: %#v", visual["colorPalette"])
	}
}

func TestWithShowLabelsSerializesAtTheTopLevel(t *testing.T) {
	builder, err := create(WithShowLabels(true))
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	bytes, err := json.Marshal(builder)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	var result map[string]any
	if err := json.Unmarshal(bytes, &result); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if result["showLabels"] != true {
		t.Errorf("expected labels to be enabled, got %#v", result["showLabels"])
	}
	visual, ok := result["visual"].(map[string]any)
	if !ok {
		t.Fatalf("expected visual options, got %#v", result["visual"])
	}
	if _, exists := visual["showLabels"]; exists {
		t.Errorf("expected labels outside visual options, got %#v", visual)
	}
}

func TestWithVisualSerializesRadiiAsYAML(t *testing.T) {
	builder, err := create(WithVisual(Visual{
		InnerRadius: 40,
		OuterRadius: 90,
	}))
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	bytes, err := yaml.Marshal(builder)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	if string(bytes) != "calculation: last\nvisual:\n    innerRadius: 40\n    outerRadius: 90\n" {
		t.Errorf("unexpected YAML: %s", bytes)
	}
}
