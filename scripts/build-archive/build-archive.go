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
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

var pluginFiles = []string{
	"dist/",
	"cue.mod/",
	"schemas/",
	"package.json",
	"README.md",
}

func createArchive(pluginName string, createGroupArchive bool) error {
	manifest, err := npm.ReadManifest(pluginName)
	if err != nil {
		return err
	}
	newArchiveFolder := filepath.Join(pluginName, pluginName)
	for _, f := range pluginFiles {
		if execErr := exec.Command("cp", "-r", filepath.Join(pluginName, f), newArchiveFolder).Run(); execErr != nil {
			return fmt.Errorf("unable to copy the file or folder %s: %w", f, execErr)
		}
	}

	// Then let's create the archive with the folder previously created
	archiveName := fmt.Sprintf("%s-%s.tar.gz", manifest.ID, manifest.Metadata.BuildInfo.Version)
	args := []string{"-czvf", filepath.Join(pluginName, archiveName), "-C", pluginName, pluginName}

	// Remove the copyfile metadata on macos
	if runtime.GOOS == "darwin" {
		args = append([]string{"--disable-copyfile"}, args...)
	}

	if execErr := exec.Command("tar", args...).Run(); execErr != nil {
		return execErr
	}

	if createGroupArchive {
		if execErr := exec.Command("cp", filepath.Join(pluginName, archiveName), filepath.Join("./plugins-archive", archiveName)).Run(); execErr != nil {
			return execErr
		}
	}

	return exec.Command("rm", "-rf", newArchiveFolder).Run()
}

func main() {
	createGroupArchive := false
	if len(os.Args) > 1 && os.Args[1] == "--group" {
		createGroupArchive = true
	}
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}
	for _, workspace := range workspaces {
		logrus.Infof("building archive for the plugin %s", workspace)
		if createArchiveErr := createArchive(workspace, createGroupArchive); createArchiveErr != nil {
			logrus.WithError(createArchiveErr).Fatalf("unable to generate the archive for the plugin %s", workspace)
		}
	}
}
