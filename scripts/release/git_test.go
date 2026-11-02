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
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGitOutput(t *testing.T) {
	initRepository(t)

	got, err := gitOutput("branch", "--show-current")
	require.NoError(t, err)
	assert.Equal(t, "main", got)

	_, err = gitOutput("rev-parse", "--verify", "unknown")
	require.ErrorContains(t, err, "fatal: Needed a single revision")
}

func TestTagExists(t *testing.T) {
	initRepository(t)
	runGit(t, "tag", "tempo/v0.61.0")

	assert.True(t, tagExists("tempo/v0.61.0"))
	assert.False(t, tagExists("tempo/v0.61.1"))
}

func TestReleaseCommit(t *testing.T) {
	tests := []struct {
		name        string
		setup       func(t *testing.T)
		expectedErr string
	}{
		{
			name:        "not on the release branch",
			setup:       func(*testing.T) {},
			expectedErr: `must be released from the branch release/v0.56, but the current branch is "main"`,
		},
		{
			name: "on the release branch of another series",
			setup: func(t *testing.T) {
				t.Helper()
				runGit(t, "checkout", "--quiet", "-b", "release/v0.55")
				runGit(t, "push", "--quiet", "origin", "release/v0.55")
			},
			expectedErr: `must be released from the branch release/v0.56, but the current branch is "release/v0.55"`,
		},
		{
			name: "release branch not pushed",
			setup: func(t *testing.T) {
				t.Helper()
				runGit(t, "checkout", "--quiet", "-b", "release/v0.56")
			},
			expectedErr: "unable to fetch the branch release/v0.56 from the remote origin",
		},
		{
			name: "local commit not pushed",
			setup: func(t *testing.T) {
				t.Helper()
				runGit(t, "checkout", "--quiet", "-b", "release/v0.56")
				runGit(t, "push", "--quiet", "origin", "release/v0.56")
				commit(t, "[BUGFIX] Tempo: local fix")
			},
			expectedErr: "is not in sync with origin/release/v0.56",
		},
		{
			name: "uncommitted changes",
			setup: func(t *testing.T) {
				t.Helper()
				commitFile(t, "package.json", `{"version": "0.61.0-beta.0"}`)
				runGit(t, "checkout", "--quiet", "-b", "release/v0.56")
				runGit(t, "push", "--quiet", "origin", "release/v0.56")
				writeFile(t, "package.json", `{"version": "0.61.0-beta.1"}`)
			},
			expectedErr: "the working tree has uncommitted changes, commit and push them first: package.json",
		},
		{
			name: "staged changes",
			setup: func(t *testing.T) {
				t.Helper()
				commitFile(t, "package.json", `{"version": "0.61.0-beta.0"}`)
				runGit(t, "checkout", "--quiet", "-b", "release/v0.56")
				runGit(t, "push", "--quiet", "origin", "release/v0.56")
				writeFile(t, "package.json", `{"version": "0.61.0-beta.1"}`)
				runGit(t, "add", "package.json")
			},
			expectedErr: "the working tree has uncommitted changes",
		},
		{
			name: "release branch in sync",
			setup: func(t *testing.T) {
				t.Helper()
				runGit(t, "checkout", "--quiet", "-b", "release/v0.56")
				runGit(t, "push", "--quiet", "origin", "release/v0.56")
			},
		},
		{
			name: "release branch in sync with untracked files",
			setup: func(t *testing.T) {
				t.Helper()
				runGit(t, "checkout", "--quiet", "-b", "release/v0.56")
				runGit(t, "push", "--quiet", "origin", "release/v0.56")
				writeFile(t, "untracked.txt", "build output")
			},
		},
		{
			name: "release branch in sync in a single-branch clone",
			setup: func(t *testing.T) {
				t.Helper()
				// the configured refspec doesn't create the remote-tracking branch of the release branch
				runGit(t, "config", "remote.origin.fetch", "+refs/heads/main:refs/remotes/origin/main")
				runGit(t, "checkout", "--quiet", "-b", "release/v0.56")
				runGit(t, "push", "--quiet", "origin", "release/v0.56")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			initRepository(t)
			tt.setup(t)

			got, err := releaseCommit("v0.56", "origin")
			if tt.expectedErr != "" {
				require.ErrorContains(t, err, tt.expectedErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, runGit(t, "rev-parse", "HEAD"), got)
		})
	}
}

// initRepository creates a git repository with a single commit on the branch main and a bare remote named origin,
// then moves into it. The user and system git configurations and the locale are ignored to keep the tests
// reproducible.
func initRepository(t *testing.T) {
	t.Helper()
	t.Setenv("LC_ALL", "C")
	t.Setenv("GIT_CONFIG_GLOBAL", os.DevNull)
	t.Setenv("GIT_CONFIG_NOSYSTEM", "1")
	t.Setenv("GIT_AUTHOR_NAME", "test")
	t.Setenv("GIT_AUTHOR_EMAIL", "test@example.com")
	t.Setenv("GIT_COMMITTER_NAME", "test")
	t.Setenv("GIT_COMMITTER_EMAIL", "test@example.com")

	dir := t.TempDir()
	remote := filepath.Join(dir, "remote.git")
	repository := filepath.Join(dir, "repository")
	runGit(t, "init", "--quiet", "--bare", remote)
	runGit(t, "init", "--quiet", "--initial-branch=main", repository)
	t.Chdir(repository)
	runGit(t, "remote", "add", "origin", remote)
	commit(t, "initial commit")
}

func commit(t *testing.T, message string) {
	t.Helper()
	runGit(t, "commit", "--quiet", "--allow-empty", "-m", message)
}

// writeFile writes the given content in the file at path, creating its parent directories if needed.
func writeFile(t *testing.T, path string, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0700))
	require.NoError(t, os.WriteFile(path, []byte(content), 0600))
}

func commitFile(t *testing.T, path string, content string) {
	t.Helper()
	writeFile(t, path, content)
	runGit(t, "add", path)
	commit(t, "add "+path)
}

func runGit(t *testing.T, args ...string) string {
	t.Helper()
	output, err := exec.Command("git", args...).CombinedOutput()
	require.NoError(t, err, "git %s\n%s", strings.Join(args, " "), output)
	return strings.TrimSpace(string(output))
}
