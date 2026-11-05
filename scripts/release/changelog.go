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
	"errors"
	"fmt"
	"os/exec"
	"strings"

	"github.com/perses/perses/scripts/pkg/changelog"
	"github.com/sirupsen/logrus"
)

// previousTag returns the closest tag of the plugin reachable from HEAD, looking first at the tags of the minor series
// of the given version: a tag of another series can be closer (e.g. when main has been merged into the release branch).
// It returns an empty string when the plugin has never been released.
func previousTag(plugin string, version string) (string, error) {
	series, err := minorSeries(version)
	if err != nil {
		return "", err
	}
	for _, pattern := range []string{fmt.Sprintf("%s/%s.*", plugin, series), plugin + "/v*"} {
		tag, err := gitOutput("describe", "--tags", "--abbrev=0", "--match", pattern)
		if err == nil {
			return tag, nil
		}
		// git describe exits with the code 128 when no tag matches the pattern
		if exitErr, ok := errors.AsType[*exec.ExitError](err); !ok || exitErr.ExitCode() != 128 {
			return "", err
		}
	}
	return "", nil
}

// pluginEntries returns the git log entries mentioning the given plugin.
func pluginEntries(entries []string, plugin string) []string {
	plugin = strings.ToLower(plugin)
	result := []string{}
	for _, entry := range entries {
		if strings.Contains(strings.ToLower(entry), plugin) {
			result = append(result, entry)
		}
	}
	return result
}

func generateChangelog(release pluginRelease) (string, error) {
	tag, err := previousTag(release.name, release.version)
	if err != nil {
		return "", fmt.Errorf("looking for the previous tag of the plugin %s: %w", release.name, err)
	}
	if tag == "" {
		logrus.Infof("no previous tag found for plugin %s, skipping changelog generation", release.name)
		return "First release", nil
	}
	logrus.Infof("previous tag for plugin %s is %s", release.name, tag)
	entries := pluginEntries(changelog.GetGitLogs(tag), release.name)
	return changelog.New(entries).GenerateChangelog(), nil
}
