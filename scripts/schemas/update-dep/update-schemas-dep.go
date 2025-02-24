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
	"os"
	"os/exec"

	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

const persesModule = "github.com/perses/perses/cue@latest"

// retrieveDep runs "cue mod get github.com/perses/perses/cue@latest" in the given workspace directory
func retrieveDep(workspace string) error {
	logrus.Infof("Retrieving dependencies for workspace: %s", workspace)

	cmd := exec.Command("sh", "-c", fmt.Sprintf("cd %s && cue mod get %s", workspace, persesModule))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to retrieve dependencies for workspace %s: %w", workspace, err)
	}

	// Run also `cue mod tidy` to remove the unused dependencies
	cmd = exec.Command("sh", "-c", fmt.Sprintf("cd %s && cue mod tidy", workspace))
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to tidy the dependencies for workspace %s: %w", workspace, err)
	}

	logrus.Infof("Successfully retrieved dependencies for workspace: %s", workspace)
	return nil
}

func main() {
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}
	for _, workspace := range workspaces {
		logrus.Infof("building archive for the plugin %s", workspace)
		if retrieveDepErr := retrieveDep(workspace); retrieveDepErr != nil {
			logrus.WithError(retrieveDepErr).Fatalf("unable to generate the archive for the plugin %s", workspace)
		}
	}
}
