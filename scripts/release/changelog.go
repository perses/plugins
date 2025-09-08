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
	"fmt"
	"os/exec"
	"strings"

	"github.com/perses/perses/scripts/changelog"
	"github.com/sirupsen/logrus"
)

func getPreviousTag(pluginName string) string {
	pluginName = strings.ToLower(pluginName)
	data, err := exec.Command("git", "describe", "--tags", "--abbrev=0", "--match", fmt.Sprintf("%s/v*", pluginName)).Output()
	if err != nil {
		logrus.Fatal(err)
	}
	return string(data)
}

func generateChangelog(pluginName string) string {
	previousTag := getPreviousTag(pluginName)
	if previousTag == "" {
		logrus.Infof("no previous tag found for plugin %s, skipping changelog generation", pluginName)
		return "First release"
	}
	logrus.Infof("previous tag for plugin %s is %s", pluginName, previousTag)
	entries := changelog.GetGitLogs(previousTag)
	var newEntries []string
	for _, entry := range entries {
		pluginName = strings.ToLower(pluginName)
		if !strings.Contains(strings.ToLower(entry), pluginName) {
			continue
		}
		newEntries = append(newEntries, entry)
	}
	return changelog.New(newEntries).GenerateChangelog()
}
