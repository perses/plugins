// Copyright 2025 The Perses Authors
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

package timeseries

import (
	"encoding/json"
	"testing"
)

func TestWithVisual_EmptyPalette(t *testing.T) {
	visual := Visual{
		Display:   LineDisplay,
		LineWidth: 1.5,
		Palette:   nil,
	}

	builder := &Builder{}
	err := WithVisual(visual)(builder)
	if err != nil {
		t.Fatalf("WithVisual failed: %v", err)
	}

	jsonBytes, err := json.Marshal(builder)
	if err != nil {
		t.Fatalf("Failed to marshal builder: %v", err)
	}

	var result map[string]any
	err = json.Unmarshal(jsonBytes, &result)
	if err != nil {
		t.Fatalf("Failed to unmarshal result: %v", err)
	}

	visualMap, ok := result["visual"].(map[string]any)
	if !ok {
		t.Fatal("Expected visual to be present in the result")
	}

	_, ok = visualMap["palette"].(map[string]any)
	if ok {
		t.Error("Palette should not be present in JSON when nil")
	}
}

func TestWithVisual_WithPaletteMode(t *testing.T) {
	visual := Visual{
		Display: LineDisplay,
		Palette: &Palette{
			Mode: AutoMode,
		},
	}

	builder := &Builder{}
	err := WithVisual(visual)(builder)
	if err != nil {
		t.Fatalf("WithVisual failed: %v", err)
	}

	if builder.Visual == nil {
		t.Fatal("Visual should not be nil")
	}

	if builder.Visual.Palette.Mode != AutoMode {
		t.Errorf("Expected palette mode to be %s, got %s", AutoMode, builder.Visual.Palette.Mode)
	}

	jsonBytes, err := json.Marshal(builder)
	if err != nil {
		t.Fatalf("Failed to marshal builder: %v", err)
	}

	var result map[string]any
	err = json.Unmarshal(jsonBytes, &result)
	if err != nil {
		t.Fatalf("Failed to unmarshal result: %v", err)
	}

	visualMap := result["visual"].(map[string]any)
	paletteMap := visualMap["palette"].(map[string]any)

	mode, exists := paletteMap["mode"]
	if !exists {
		t.Error("Expected palette mode to be present in JSON when explicitly set")
	}

	if mode != string(AutoMode) {
		t.Errorf("Expected palette mode to be %s, got %v", AutoMode, mode)
	}
}
