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

	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

// Defined as a const and not as a flag or whatever because it's supposed to be removed when moving to CUE's dependencies management
const percliVersion = "v0.50.1"

/*
 * Get the dependencies (= CUE packages imported) for the given plugin
 *
 * NB: for now this relies on the `percli plugin update` command that only installs the common package provided by Perses.
 * This should be replaced by relying on CUE's dependencies management (`cue get`) when possible.
 */
func getDependencies(pluginName string) error {

	// Change to the plugin directory
	originalDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get the current working directory: %w", err)
	}
	defer os.Chdir(originalDir) // Ensure we return to the original directory

	if err := os.Chdir(pluginName); err != nil {
		return fmt.Errorf("failed to change to the plugin directory %s: %w", pluginName, err)
	}

	// Execute `percli plugin update`
	cmd := exec.Command("percli", "plugin", "update", "--version", percliVersion)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to execute `percli plugin update`: %w", err)
	}

	return nil
}

func main() {
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}
	for _, workspace := range workspaces {
		logrus.Infof("get CUE dependencies for the plugin %s", workspace)
		if getDepsErr := getDependencies(workspace); getDepsErr != nil {
			logrus.WithError(getDepsErr).Fatalf("unable to get the dependencies for the plugin %s", workspace)
		}
	}
}
