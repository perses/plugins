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
	"flag"
	"fmt"
	"runtime"
	"time"

	"github.com/perses/common/async"
	"github.com/perses/perses/scripts/pkg/command"
	"github.com/perses/plugins/scripts/npm"
	"github.com/perses/plugins/scripts/tag"
	"github.com/sirupsen/logrus"
)

func main() {
	workspaces := npm.MustGetWorkspaces(".")
	pluginsToBuild := make([]async.Future[string], 0, len(workspaces))

	t := tag.Flag()
	flag.Parse()

	buildPlugin := func(path string) (string, error) {
		return path, command.Run("percli", "plugin", "build", fmt.Sprintf("--plugin.path=%s", path), "--skip.npm-install=true")
	}

	if *t != "" {
		pluginPath, _ := tag.Parse(t)
		pluginsToBuild = append(pluginsToBuild, async.Async(func() (string, error) {
			return buildPlugin(pluginPath)
		}))
	} else {
		logrus.Info("no tag provided, building all plugins")

		maxConcurrency := runtime.NumCPU()
		semaphore := make(chan struct{}, maxConcurrency)
		logrus.Infof("building with concurrency limited to %d (number of CPUs)", maxConcurrency)

		for _, workspace := range workspaces {
			logrus.Infof("Building plugin %s", workspace)
			pluginsToBuild = append(pluginsToBuild, async.Async(func() (string, error) {
				semaphore <- struct{}{}
				defer func() { <-semaphore }()
				return buildPlugin(workspace)
			}))
		}
	}
	isErr := false
	for _, pluginToBuild := range pluginsToBuild {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
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
