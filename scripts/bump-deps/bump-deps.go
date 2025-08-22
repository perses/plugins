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
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"github.com/perses/plugins/scripts/command"
	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

var bumpNPMDeps = regexp.MustCompile(`"@perses-dev/([a-zA-Z-]+)":\s*"(\^)?[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)\.[0-9]+)?"`)

func bumpGoDep(workspace, version string) {
	goGetCMD := command.Create("go", "get", fmt.Sprintf("github.com/perses/perses@v%s", version))
	goGetCMD.Dir = workspace
	if err := goGetCMD.Run(); err != nil {
		logrus.WithError(err).WithField("workspace", workspace).Fatal("unable to bump the go dependencies")
	}
	goModTidyCMD := command.Create("go", "mod", "tidy")
	goModTidyCMD.Dir = workspace
	if err := goModTidyCMD.Run(); err != nil {
		logrus.WithError(err).WithField("workspace", workspace).Fatal("unable to run go mod tidy")
	}
	logrus.Infof("successfully bumped go dependencies for %s to version %s", workspace, version)
}

func bumpPackage(path string, version string) {
	pkgPath := filepath.Join(path, "package.json")
	data, err := os.ReadFile(pkgPath)
	if err != nil {
		logrus.WithError(err).Fatalf("unable to read the file %s", pkgPath)
	}
	newDate := bumpNPMDeps.ReplaceAll(data, []byte(fmt.Sprintf(`"@perses-dev/$1": "^%s"`, version)))
	if writeErr := os.WriteFile(pkgPath, newDate, 0644); writeErr != nil {
		logrus.WithError(writeErr).Fatalf("unable to write the file %s", pkgPath)
	}
	logrus.Infof("successfully bumped npm dependencies for %s to version %s", path, version)
}

// This script bumps all perse-dev dependencies for go and npm packages to the provided version.
// To be used like that: go run ./scripts/bump-deps/bump-deps.go --version=<version>
// Note: the version provided does not contain the prefix 'v'.
// Example: go run ./scripts/bump-deps/bump-deps.go --version=0.52.0-beta.4
func main() {
	version := flag.String("version", "", "the version to use for the bump.")
	flag.Parse()
	if *version == "" {
		logrus.Fatal("you must provide a version to use for the bump")
	}
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}
	bumpPackage("", *version)
	for _, workspace := range workspaces {
		bumpGoDep(workspace, *version)
		bumpPackage(workspace, *version)
	}
	if npmErr := command.Run("npm", "install"); npmErr != nil {
		logrus.WithError(npmErr).Fatal("unable to run npm install")
	} else {
		logrus.Info("successfully ran npm install")
	}
}
