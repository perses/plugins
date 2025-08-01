// Copyright 2024 The Perses Authors
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
	"encoding/json"
	"flag"
	"fmt"
	"os/exec"
	"path/filepath"

	"github.com/perses/plugins/scripts/command"
	"github.com/perses/plugins/scripts/npm"
	"github.com/perses/plugins/scripts/tag"
	"github.com/sirupsen/logrus"
)

func main() {
	t := tag.Flag()
	flag.Parse()
	pluginFolderName, version := tag.Parse(t)
	// The manifest is hopefully uploaded by a previous task in the CI
	// It should be available in the plugin folder
	manifest, err := npm.ReadManifest(pluginFolderName)
	if err != nil {
		logrus.WithError(err).Fatalf("unable to read manifest file for plugin %s", pluginFolderName)
	}
	pluginName := manifest.Name

	// Check that the archive release does not already exist
	expectedArchiveName := fmt.Sprintf("%s-%s.tar.gz", pluginName, version)
	cmd := exec.Command("gh", "release", "view", *t, "--json", "assets")
	output, execErr := cmd.CombinedOutput()
	if execErr == nil {
		var releaseInfo struct {
			Assets []struct {
				Name string `json:"name"`
			} `json:"assets"`
		}
		if jsonErr := json.Unmarshal(output, &releaseInfo); jsonErr != nil {
			logrus.WithError(jsonErr).Warnf("failed to parse gh release view output for tag %s, proceeding with upload attempt", *t)
		} else {
			for _, asset := range releaseInfo.Assets {
				if asset.Name == expectedArchiveName {
					logrus.Warnf("archive %s already exists in release %s, skipping upload", expectedArchiveName, *t)
					return
				}
			}
			logrus.Infof("release %s found, but archive %s is missing. Proceeding with upload.", *t, expectedArchiveName)
		}
	} else {
		logrus.Infof("release %s not found or gh command failed, proceeding with upload attempt. Error: %v", *t, execErr)
	}

	// Upload the archive to GitHub
	if execErr := command.Run("gh", "release", "upload", *t, filepath.Join(pluginFolderName, fmt.Sprintf("%s-%s.tar.gz", pluginName, version))); execErr != nil {
		logrus.WithError(execErr).Fatalf("unable to upload archive %s", pluginName)
	}
}
