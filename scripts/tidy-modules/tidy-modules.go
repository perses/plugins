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

	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

func executeCMD(workspace string, cmd *exec.Cmd) error {
	cmd.Dir = workspace
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to tidy module in workspace %s: %w\nOutput: %s", workspace, err, string(output))
	}
	return nil
}

// tidyCueModule runs "cue mod tidy" in the given workspace
func tidyCueModule(workspace string) error {
	return executeCMD(workspace, exec.Command("cue", "mod", "tidy"))
}

// tidyGoModule runs "cue mod tidy" in the given workspace
func tidyGoModule(workspace string) error {
	return executeCMD(workspace, exec.Command("go", "mod", "tidy"))
}

func main() {
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of workspaces")
	}
	for _, workspace := range workspaces {
		logrus.Infof("Tidying module in workspace %s..", workspace)
		if retrieveDepErr := tidyCueModule(workspace); retrieveDepErr != nil {
			logrus.WithError(retrieveDepErr).Fatalf("unable to resolve the module dependencies for plugin %s", workspace)
			continue
		}
		if retrieveDepErr := tidyGoModule(workspace); retrieveDepErr != nil {
			logrus.WithError(retrieveDepErr).Fatalf("unable to resolve the module dependencies for plugin %s", workspace)
		} else {
			logrus.Infof("Successfully tidied module in workspace %s", workspace)
		}
	}
}
