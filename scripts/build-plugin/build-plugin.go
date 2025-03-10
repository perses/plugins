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
	"bytes"
	"fmt"
	"os"
	"os/exec"

	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

func runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to run %s %v: %w\nstderr: %s", name, args, err, stderr.String())
	}
	return nil
}

func main() {
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}
	for _, workspace := range workspaces {
		logrus.Infof("Building plugin %s", workspace)
		if errCMD := runCommand("percli", "plugin", "build", fmt.Sprintf("--plugin.path=%s", workspace), "--skip.npm-install=true"); errCMD != nil {
			logrus.WithError(errCMD).Fatalf("Unable to build plugin %s", workspace)
		}
	}
}
