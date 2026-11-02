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
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMinorSeries(t *testing.T) {
	tests := []struct {
		name           string
		version        string
		expectedSeries string
		expectedBranch string
		expectErr      bool
	}{
		{name: "beta", version: "0.56.0-beta.0", expectedSeries: "v0.56", expectedBranch: "release/v0.56"},
		{name: "release candidate", version: "0.56.0-rc.1", expectedSeries: "v0.56", expectedBranch: "release/v0.56"},
		{name: "final release", version: "0.56.0", expectedSeries: "v0.56", expectedBranch: "release/v0.56"},
		{name: "patch release", version: "0.56.12", expectedSeries: "v0.56", expectedBranch: "release/v0.56"},
		{name: "major release", version: "1.0.0", expectedSeries: "v1.0", expectedBranch: "release/v1.0"},
		{name: "v prefix", version: "v0.56.0", expectErr: true},
		{name: "missing patch", version: "0.56", expectErr: true},
		{name: "empty", version: "", expectErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			series, err := minorSeries(tt.version)
			if tt.expectErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expectedSeries, series)
			assert.Equal(t, tt.expectedBranch, releaseBranch(series))
		})
	}
}

func TestParseSharedVersion(t *testing.T) {
	tests := []struct {
		name         string
		versionRange string
		expected     string
		expectErr    bool
	}{
		{name: "caret beta", versionRange: "^0.56.0-beta.0", expected: "0.56.0-beta.0"},
		{name: "caret release candidate", versionRange: "^0.56.0-rc.2", expected: "0.56.0-rc.2"},
		{name: "caret final", versionRange: "^0.56.0", expected: "0.56.0"},
		{name: "tilde patch", versionRange: "~0.56.3", expected: "0.56.3"},
		{name: "exact version", versionRange: "0.56.1", expected: "0.56.1"},
		{name: "surrounding spaces", versionRange: " ^0.56.0 ", expected: "0.56.0"},
		{name: "comparison operator", versionRange: ">=0.56.0", expectErr: true},
		{name: "union of ranges", versionRange: "^0.55.0 || ^0.56.0", expectErr: true},
		{name: "x-range", versionRange: "0.56.x", expectErr: true},
		{name: "empty", versionRange: "", expectErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := parseSharedVersion(tt.versionRange)
			if tt.expectErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestGetSharedVersion(t *testing.T) {
	dir := t.TempDir()
	writePackage(t, dir, `{
  "name": "perses-plugins",
  "devDependencies": {
    "@perses-dev/components": "^0.55.0",
    "@perses-dev/plugin-system": "^0.56.0-beta.1"
  }
}`)
	got, err := getSharedVersion(dir)
	require.NoError(t, err)
	assert.Equal(t, "0.56.0-beta.1", got)

	writePackage(t, dir, `{"name": "perses-plugins", "devDependencies": {"@perses-dev/components": "^0.56.0"}}`)
	_, err = getSharedVersion(dir)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "@perses-dev/plugin-system is not declared in the devDependencies")
}

func TestSelectPlugins(t *testing.T) {
	workspaces := []string{"prometheus", "tempo"}
	tests := []struct {
		name        string
		pluginName  string
		all         bool
		expected    []string
		expectedErr string
	}{
		{name: "all plugins", all: true, expected: workspaces},
		{name: "single plugin", pluginName: "tempo", expected: []string{"tempo"}},
		{name: "no flag", expectedErr: "either the flag --all or --name must be set"},
		{name: "both flags", pluginName: "tempo", all: true, expectedErr: "mutually exclusive"},
		{name: "unknown plugin", pluginName: "Tempo", expectedErr: `unknown plugin "Tempo"`},
		{name: "e2e workspace", pluginName: "e2e", expectedErr: `unknown plugin "e2e"`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := selectPlugins(workspaces, tt.pluginName, tt.all)
			if tt.expectedErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestPendingReleases(t *testing.T) {
	initRepository(t)
	writePluginPackage(t, "prometheus", "0.60.0-beta.1")
	writePluginPackage(t, "tempo", "0.61.0-beta.1")
	runGit(t, "tag", "tempo/v0.61.0-beta.1")

	got, err := pendingReleases([]string{"prometheus", "tempo"})
	require.NoError(t, err)
	assert.Equal(t, []pluginRelease{{name: "prometheus", version: "0.60.0-beta.1"}}, got)

	writePluginPackage(t, "loki", "next")
	_, err = pendingReleases([]string{"loki"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), `version "next" of the plugin loki doesn't follow the semver`)
}

func TestCheckPrerelease(t *testing.T) {
	betaRelease := pluginRelease{name: "tempo", version: "0.61.0-beta.1"}
	rcRelease := pluginRelease{name: "loki", version: "0.8.0-rc.0"}
	stableRelease := pluginRelease{name: "prometheus", version: "0.60.0"}
	patchRelease := pluginRelease{name: "table", version: "0.15.1"}

	tests := []struct {
		name          string
		sharedVersion string
		releases      []pluginRelease
		expectedErr   string
	}{
		{name: "pre-release plugins with shared beta", sharedVersion: "0.56.0-beta.0", releases: []pluginRelease{betaRelease, rcRelease}},
		{name: "stable plugins with shared final", sharedVersion: "0.56.0", releases: []pluginRelease{stableRelease, patchRelease}},
		{name: "pre-release plugins with shared final", sharedVersion: "0.56.1", releases: []pluginRelease{betaRelease}},
		{
			name:          "stable plugins with shared beta",
			sharedVersion: "0.56.0-beta.0",
			releases:      []pluginRelease{betaRelease, stableRelease, patchRelease},
			expectedErr:   "@perses-dev/plugin-system 0.56.0-beta.0 is a pre-release, so the plugins must be released as a pre-release (beta, rc...) too: prometheus/v0.60.0, table/v0.15.1",
		},
		{
			name:          "stable plugin with shared release candidate",
			sharedVersion: "0.56.0-rc.0",
			releases:      []pluginRelease{stableRelease},
			expectedErr:   "too: prometheus/v0.60.0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := checkPrerelease(tt.releases, tt.sharedVersion)
			if tt.expectedErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedErr)
				return
			}
			assert.NoError(t, err)
		})
	}
}

func TestGHReleaseArgs(t *testing.T) {
	tests := []struct {
		name     string
		release  pluginRelease
		expected []string
	}{
		{
			name:    "final release",
			release: pluginRelease{name: "tempo", version: "0.61.0"},
			expected: []string{
				"release", "create", "tempo/v0.61.0", "--repo", "perses/plugins", "--target", "abc", "--title",
				"tempo/v0.61.0", "--notes", "notes",
			},
		},
		{
			name:    "patch release",
			release: pluginRelease{name: "tempo", version: "0.61.3"},
			expected: []string{
				"release", "create", "tempo/v0.61.3", "--repo", "perses/plugins", "--target", "abc", "--title",
				"tempo/v0.61.3", "--notes", "notes",
			},
		},
		{
			name:    "beta",
			release: pluginRelease{name: "tempo", version: "0.61.0-beta.0"},
			expected: []string{
				"release", "create", "tempo/v0.61.0-beta.0", "--repo", "perses/plugins", "--target", "abc", "--title",
				"tempo/v0.61.0-beta.0", "--prerelease", "--notes", "notes",
			},
		},
		{
			name:    "release candidate",
			release: pluginRelease{name: "tempo", version: "0.61.0-rc.1"},
			expected: []string{
				"release", "create", "tempo/v0.61.0-rc.1", "--repo", "perses/plugins", "--target", "abc", "--title",
				"tempo/v0.61.0-rc.1", "--prerelease", "--notes", "notes",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.expected, ghReleaseArgs(tt.release, "abc", "notes"))
		})
	}
}

func writePackage(t *testing.T, dir string, content string) {
	t.Helper()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "package.json"), []byte(content), 0600))
}

func writePluginPackage(t *testing.T, plugin string, version string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(plugin, 0700))
	writePackage(t, plugin, fmt.Sprintf(`{"name": "@perses-dev/%s-plugin", "version": %q}`, plugin, version))
}
