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
	"flag"

	"github.com/perses/perses/scripts/pkg/command"
	"github.com/sirupsen/logrus"
)

func bump(pluginName, bumpType, preID string) error {
	if pluginName == "" {
		if preID == "" {
			return command.Run("pnpm", "--recursive", "version", bumpType, "--no-git-tag-version")
		}
		return command.Run("pnpm", "--recursive", "version", bumpType, "--preid", preID, "--no-git-tag-version")
	}
	if preID == "" {
		return command.Run("pnpm", "--filter", pluginName, "version", bumpType, "--no-git-tag-version")
	}
	return command.Run("pnpm", "--filter", pluginName, "version", bumpType, "--preid", preID, "--no-git-tag-version")
}

func main() {
	bumpAll := flag.Bool("all", false, `bump all the plugins versions to the next minor version.
You can also reuse it to create and update beta, rc, ...
# Creation of the first beta
go run ./scripts/bump-plugin --all --type preminor --preid beta

# Following betas
go run ./scripts/bump-plugin --all --type prerelease --preid beta`)
	bumpSinglePlugin := flag.String("name", "", "bump a single plugin to the next minor version")
	bumpType := flag.String("type", "minor", "the type of version bump (major, minor, patch)")
	bumpPreID := flag.String("preid", "", "the preid for the version bump (alpha, beta, rc)")
	flag.Parse()
	if !*bumpAll {
		if len(*bumpSinglePlugin) == 0 {
			logrus.Fatal("you must provide a plugin name if the --all flag is not set")
		}
		logrus.Infof("bumping %s", *bumpSinglePlugin)
		if err := bump(*bumpSinglePlugin, *bumpType, *bumpPreID); err != nil {
			logrus.WithError(err).Fatalf("unable to bump the version of the plugin %s", *bumpSinglePlugin)
		}
		return
	}
	logrus.Info("bumping all the plugins")
	if err := bump("", *bumpType, *bumpPreID); err != nil {
		logrus.WithError(err).Fatal("unable to bump the versions of the plugins")
	}
}
