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
	"flag"
	"fmt"
	"os/exec"

	"github.com/perses/plugins/scripts/command"
	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

func release(pluginName string, optionalReleaseMessage string) {
	version, err := npm.GetVersion(pluginName)
	if err != nil {
		logrus.WithError(err).Fatalf("unable to get the version of the plugin %s", pluginName)
	}
	// To be compliant with Golang, the tag must be in the format `folder/vX.Y.Z`
	releaseName := fmt.Sprintf("%s/v%s", pluginName, version)
	// ensure the tag does not already exist
	if execErr := command.Run("git", "rev-parse", "--verify", releaseName); execErr == nil {
		logrus.Infof("release %s already exists", releaseName)
		return
	}
	// create the GitHub release
	if execErr := command.Run("gh", "release", "create", releaseName, "-t", releaseName, "-n", optionalReleaseMessage); execErr != nil {
		logrus.WithError(execErr).Fatalf("unable to create the release %s", releaseName)
	}
}

// This script generates Github release(s).
//
// Prerequisites for running this script:
// - Install the GitHub CLI (gh): https://github.com/cli/cli#installation
// - Use it to log in to GitHub: `gh auth login`
//
// Usage:
//
// This will release every plugin not yet released:
//
//	go run ./scripts/release/release.go --all
//
// This will release only the tempo plugin (note that the `--name` flag is set with the folder name not the plugin name):
//
//	go run ./scripts/release/release.go --name=tempo
//
// To add a release message that will appear in every release:
//
//	go run ./scripts/release/release.go --all --message="Release message"
//
// NB: this script doesn't handle the plugin archive creation, a CI task achieves this.
func main() {
	releaseAll := flag.Bool("all", false, "release all the plugins")
	releaseSingleName := flag.String("name", "", "release a single plugin")
	optionalReleaseMessage := flag.String("message", "", "release message")
	flag.Parse()
	// get all tags locally
	if err := exec.Command("git", "fetch", "--tags").Run(); err != nil {
		logrus.WithError(err).Fatal("unable to fetch the tags")
	}
	if !*releaseAll {
		logrus.Infof("releasing %s", *releaseSingleName)
		release(*releaseSingleName, *optionalReleaseMessage)
		return
	}
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}
	for _, workspace := range workspaces {
		logrus.Infof("releasing %s", workspace)
		release(workspace, *optionalReleaseMessage)
	}
}
