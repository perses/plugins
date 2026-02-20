// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"os"
	"os/exec"

	"github.com/perses/perses/scripts/pkg/npm"
	"github.com/sirupsen/logrus"
)

func main() {
	var isError bool

	for _, workspace := range npm.MustGetWorkspaces(".") {
		schemasPath := workspace + "/schemas"
		if _, err := os.Stat(schemasPath); os.IsNotExist(err) {
			// No schemas, skip go validation
			logrus.Infof("skipping golangci-lint for %s (no schemas)", workspace)
			continue
		}

		cmd := exec.Command("golangci-lint", "run")
		cmd.Dir = workspace
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if execErr := cmd.Run(); execErr != nil {
			isError = true
			logrus.WithError(execErr).Errorf("issue with golangci for the plugin %s", workspace)
		} else {
			logrus.Infof("golangci-lint passed for the plugin %s", workspace)
		}
	}
	if isError {
		logrus.Fatal("some plugins failed the golangci-lint check")
	} else {
		logrus.Info("all plugins passed the golangci-lint check")
	}
}
