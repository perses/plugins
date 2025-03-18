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

// tidyModule runs "cue mod tidy" in the given workspace
func tidyModule(workspace string) error {
	logrus.Infof("Tidying module in workspace %s..", workspace)

	cmd := exec.Command("cue", "mod", "tidy")
	cmd.Dir = workspace

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to tidy CUE module in workspace %s: %w\nOutput: %s", workspace, err, string(output))
	}

	logrus.Infof("Successfully tidied module in workspace %s", workspace)
	return nil
}

func main() {
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of workspaces")
	}
	for _, workspace := range workspaces {
		if retrieveDepErr := tidyModule(workspace); retrieveDepErr != nil {
			logrus.WithError(retrieveDepErr).Fatalf("unable to resolve the module dependencies for plugin %s", workspace)
		}
	}
}
