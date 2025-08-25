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

package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReplaceNPMPackage(t *testing.T) {
	original := []byte(`{
  "name": "@perses-dev/plugin-example",
  "version": "0.1.0",
  "dependencies": {
	"@perses-dev/core": "^0.51.0",
	"@perses-dev/dashboards": "^0.51.0",
	"@perses-dev/panels": "^0.51.0",
	"@perses-dev/alerting": "^0.51.0",
	"react": "^17.0.2"
  }
}`)
	expected := []byte(`{
  "name": "@perses-dev/plugin-example",
  "version": "0.1.0",
  "dependencies": {
	"@perses-dev/core": "^0.52.0-beta.4",
	"@perses-dev/dashboards": "^0.52.0-beta.4",
	"@perses-dev/panels": "^0.52.0-beta.4",
	"@perses-dev/alerting": "^0.52.0-beta.4",
	"react": "^17.0.2"
  }
}`)
	result := replaceNPMPackage(original, "0.52.0-beta.4")
	assert.Equal(t, string(expected), string(result))
}

func TestReplaceCUEPackage(t *testing.T) {
	original := []byte(`module: "github.com/perses/plugins/gaugechart@v0"
language: {
	version: "v0.14.0"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.51.0"
		default: true
	}
}
`)
	expected := []byte(`module: "github.com/perses/plugins/gaugechart@v0"
language: {
	version: "v0.14.0"
}
source: {
	kind: "git"
}
deps: {
	"github.com/perses/perses/cue@v0": {
		v:       "v0.52.0-beta.4"
		default: true
	}
}
`)
	result := replaceCuePackage(original, "0.52.0-beta.4")
	assert.Equal(t, string(expected), string(result))
}
