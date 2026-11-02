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

package npm

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const rootPackage = `{
  "name": "perses-plugins",
  "workspaces": ["prometheus", "e2e", "tempo"],
  "devDependencies": {
    "@perses-dev/plugin-system": "^0.56.0-beta.0"
  }
}`

func TestGetWorkspaces(t *testing.T) {
	t.Parallel()
	dir := writePackage(t, rootPackage)

	workspaces, err := GetWorkspaces(dir)
	require.NoError(t, err)
	assert.Equal(t, []string{"prometheus", "tempo"}, workspaces)

	_, err = GetWorkspaces(t.TempDir())
	assert.Error(t, err)
}

func TestGetDevDependency(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name        string
		content     string
		dependency  string
		expected    string
		expectedErr string
	}{
		{
			name:       "declared dependency",
			content:    rootPackage,
			dependency: "@perses-dev/plugin-system",
			expected:   "^0.56.0-beta.0",
		},
		{
			name:        "undeclared dependency",
			content:     rootPackage,
			dependency:  "@perses-dev/components",
			expectedErr: "@perses-dev/components is not declared in the devDependencies of",
		},
		{
			name:        "no devDependencies",
			content:     `{"name": "perses-plugins"}`,
			dependency:  "@perses-dev/plugin-system",
			expectedErr: "@perses-dev/plugin-system is not declared in the devDependencies of",
		},
		{
			name:        "invalid package.json",
			content:     `{"devDependencies": [`,
			dependency:  "@perses-dev/plugin-system",
			expectedErr: "parsing ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := GetDevDependency(writePackage(t, tt.content), tt.dependency)
			if tt.expectedErr != "" {
				require.ErrorContains(t, err, tt.expectedErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, got)
		})
	}
}

// writePackage writes a package.json with the given content in a temporary directory and returns this directory.
func writePackage(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "package.json"), []byte(content), 0600))
	return dir
}
