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

package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPreviousTag(t *testing.T) {
	tests := []struct {
		name     string
		version  string
		setup    func(t *testing.T)
		expected string
	}{
		{
			name:     "never released",
			version:  "0.61.0-beta.0",
			setup:    func(*testing.T) {},
			expected: "",
		},
		{
			name:    "tag of another plugin is ignored",
			version: "0.61.0-beta.0",
			setup: func(t *testing.T) {
				runGit(t, "tag", "prometheus/v0.60.0")
				runGit(t, "tag", "logstable/v0.5.0")
			},
			expected: "",
		},
		{
			name:    "closest tag when the series has no tag yet",
			version: "0.61.0-beta.0",
			setup: func(t *testing.T) {
				runGit(t, "tag", "tempo/v0.60.0")
				commit(t, "[FEATURE] Tempo: new feature")
			},
			expected: "tempo/v0.60.0",
		},
		{
			name:    "tag of the series when a tag of another series is closer",
			version: "0.62.0-beta.1",
			setup: func(t *testing.T) {
				runGit(t, "tag", "tempo/v0.62.0-beta.0")
				commit(t, "[BUGFIX] Tempo: fix released in v0.61.1")
				runGit(t, "tag", "tempo/v0.61.1")
				commit(t, "[FEATURE] Tempo: new feature")
			},
			expected: "tempo/v0.62.0-beta.0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			initRepository(t)
			tt.setup(t)

			got, err := previousTag("tempo", tt.version)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestPluginEntries(t *testing.T) {
	entries := []string{
		"abc [FEATURE] Tempo: new feature",
		"def [BUGFIX] Prometheus: fix",
		"ghi [ENHANCEMENT] improve the tempo explorer",
	}
	expected := []string{
		"abc [FEATURE] Tempo: new feature",
		"ghi [ENHANCEMENT] improve the tempo explorer",
	}
	assert.Equal(t, expected, pluginEntries(entries, "tempo"))
	assert.Empty(t, pluginEntries(entries, "loki"))
}

func TestGenerateChangelog(t *testing.T) {
	initRepository(t)
	release := pluginRelease{name: "tempo", version: "0.61.0"}

	notes, err := generateChangelog(release)
	require.NoError(t, err)
	assert.Equal(t, "First release", notes)

	runGit(t, "tag", "tempo/v0.60.0")
	commit(t, "[FEATURE] Tempo: new feature")
	commit(t, "[BUGFIX] Prometheus: fix")
	commit(t, "[IGNORE] Tempo: internal change")

	notes, err = generateChangelog(release)
	require.NoError(t, err)
	assert.Equal(t, "- [FEATURE] Tempo: new feature\n", notes)
}
