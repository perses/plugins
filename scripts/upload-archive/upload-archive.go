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
	"flag"
	"fmt"
	"os/exec"
	"path/filepath"

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
	if execErr := exec.Command("gh", "release", "upload", *t, filepath.Join(pluginFolderName, fmt.Sprintf("%s-%s.tar.gz", pluginName, version))).Run(); execErr != nil {
		logrus.WithError(execErr).Fatalf("unable to upload archive %s", pluginName)
	}
}
