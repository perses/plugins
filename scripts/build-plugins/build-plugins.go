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
	"context"
	"fmt"
	"time"

	"github.com/perses/common/async"
	"github.com/perses/plugins/scripts/command"
	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

func main() {
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}

	pluginsToBuild := make([]async.Future[string], 0, len(workspaces))

	for _, workspace := range workspaces {
		logrus.Infof("Building plugin %s", workspace)
		pluginsToBuild = append(pluginsToBuild, async.Async(func() (string, error) {
			return workspace, command.Run("percli", "plugin", "build", fmt.Sprintf("--plugin.path=%s", workspace), "--skip.npm-install=true")
		}))
	}
	isErr := false
	for _, pluginToBuild := range pluginsToBuild {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		workspace, buildErr := pluginToBuild.AwaitWithContext(ctx)
		if buildErr != nil {
			isErr = true
			logrus.WithError(buildErr).Errorf("failed to build plugin %s", workspace)
		}
		cancel()
	}
	if isErr {
		logrus.Fatal("some plugins have not been built successfully")
	}
}
