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

	"github.com/perses/plugins/scripts/command"
	"github.com/sirupsen/logrus"
)

func bump(pluginName string, bumpType string) error {
	if pluginName == "" {
		return command.Run("npm", "version", bumpType, "--workspaces", "--no-git-tag-version")
	}
	return command.Run("npm", "version", bumpType, "--workspace", pluginName, "--no-git-tag-version")
}

func main() {
	bumpAll := flag.Bool("all", false, "bump all the plugins versions to the next minor version")
	bumpSinglePlugin := flag.String("name", "", "bump a single plugin to the next minor version")
	bumpType := flag.String("type", "minor", "the type of version bump (major, minor, patch)")
	flag.Parse()
	if !*bumpAll {
		if len(*bumpSinglePlugin) == 0 {
			logrus.Fatal("you must provide a plugin name if the --all flag is not set")
		}
		logrus.Infof("bumping %s", *bumpSinglePlugin)
		if err := bump(*bumpSinglePlugin, *bumpType); err != nil {
			logrus.WithError(err).Fatalf("unable to bump the version of the plugin %s", *bumpSinglePlugin)
		}
		return
	}
	logrus.Info("bumping all the plugins")
	if err := bump("", *bumpType); err != nil {
		logrus.WithError(err).Fatal("unable to bump the versions of the plugins")
	}
}
