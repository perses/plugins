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

package traceheatmapchart

import (
	"encoding/json"
	"testing"

	"github.com/perses/perses/go-sdk/panel"
)

func TestChart(t *testing.T) {
	tests := []struct {
		title     string
		options   []Option
		expected  string
		wantError bool
	}{
		{title: "return default panel builder", options: nil, expected: "{\"bucketSettings\":{\"base\":2}}", wantError: false},
		{title: "return panel builder with base 2", options: []Option{Base(BucketBaseTwo)}, expected: "{\"bucketSettings\":{\"base\":2}}", wantError: false},
		{title: "return panel builder with base 10", options: []Option{Base(BucketBaseTen)}, expected: "{\"bucketSettings\":{\"base\":10}}", wantError: false},
		{title: "return panel builder with base 10", options: []Option{Base(7)}, expected: "", wantError: true},
	}

	for _, tt := range tests {
		t.Run(tt.title, func(t *testing.T) {
			build := Chart(tt.options...)
			panelBuilder := &panel.Builder{}
			err := build(panelBuilder)

			if err != nil {
				if !tt.wantError {
					t.Fatalf("build returned unexpected error %v", err)
				}
				return
			}

			actual, err := json.Marshal(panelBuilder.Spec.Plugin.Spec)
			if err != nil {
				t.Fatalf("marshal failed: %v", err)
			}
			if string(actual) != tt.expected {
				t.Fatalf("received %s want %s", string(actual), tt.expected)
			}
		})
	}
}

func TestCreateUsesDefaultBase(t *testing.T) {
	builder, err := create()
	if err != nil {
		t.Fatalf("create returned an unexpected error: %v", err)
	}

	if builder.BucketSettings.Base != BucketBaseTwo {
		t.Errorf("default base = %d, want %d", builder.BucketSettings.Base, BucketBaseTwo)
	}
}

func TestCreateOverridesDefaultBase(t *testing.T) {
	builder, err := create(Base(BucketBaseTen))
	if err != nil {
		t.Fatalf("create returned unexpected error: %v", err)
	}

	if builder.BucketSettings.Base != BucketBaseTen {
		t.Errorf("base = %d, want %d", builder.BucketSettings.Base, BucketBaseTen)
	}
}

func TestCreateReturnOptionError(t *testing.T) {
	_, err := create(Base(7))

	if err == nil {
		t.Fatalf("create expected an error, got nil")
	}
}
