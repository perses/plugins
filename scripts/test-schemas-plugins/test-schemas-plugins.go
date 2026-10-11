// Copyright The Perses Authors
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
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/perses/common/async"
	"github.com/perses/perses/scripts/pkg/command"
	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

// dashboardTestDir contains an optional CUE package defining a "#Dashboard" that embeds the plugin schema the way
// Perses does when merging all plugin schemas, along with JSON dashboards that must validate against it.
const dashboardTestDir = "schemas/tests/dashboard"

func testSchemas(workspace string) error {
	if err := command.Run("percli", "plugin", "test-schemas", fmt.Sprintf("--plugin.path=%s", workspace)); err != nil {
		return err
	}
	if _, err := os.Stat(filepath.Join(workspace, dashboardTestDir)); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	dashboards, err := filepath.Glob(filepath.Join(workspace, dashboardTestDir, "*.json"))
	if err != nil {
		return err
	}
	for _, dashboard := range dashboards {
		relPath, relErr := filepath.Rel(workspace, dashboard)
		if relErr != nil {
			return relErr
		}
		if vetErr := command.RunInDirectory(workspace, "cue", "vet", "-d", "#Dashboard", "./"+dashboardTestDir, relPath); vetErr != nil {
			return fmt.Errorf("dashboard schema test %s failed: %w", relPath, vetErr)
		}
	}
	return nil
}

func main() {
	workspaces := npm.MustGetWorkspaces(".")
	plugins := make([]async.Future[string], 0, len(workspaces))

	for _, workspace := range workspaces {
		logrus.Infof("Testing schemas of plugin %s", workspace)
		plugins = append(plugins, async.Async(func() (string, error) {
			return workspace, testSchemas(workspace)
		}))
	}
	isErr := false
	for _, plugin := range plugins {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
		workspace, buildErr := plugin.AwaitWithContext(ctx)
		if buildErr != nil {
			isErr = true
			logrus.WithError(buildErr).Errorf("failed to test the schemas of plugin %s", workspace)
		}
		cancel()
	}
	if isErr {
		logrus.Fatal("some plugins have schemas tests failing")
	}
}
