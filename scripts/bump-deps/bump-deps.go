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
	"bytes"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"github.com/perses/perses/scripts/pkg/command"
	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

var (
	// sharedPackageNames contains the list of packages release by the repository perses/shared to bump
	sharedPackageNames = []string{"components", "dashboards", "plugin-system", "explore", "client"}
	// specPackageNames contains the list of packages release by the repository perses/spec to bump
	specPackageNames = []string{"spec"}
)

func logBumpSuccess(language string, workspace string, version string) {
	isRootMessage := ""
	if workspace == "" {
		isRootMessage = " (root)"
	}
	logrus.Infof("successfully bumped %s dependencies for %q%s to version %s", language, workspace, isRootMessage, version)
}

func bumpGoDep(workspace, version, repository string) {
	goGetCMD := command.Create("go", "get", fmt.Sprintf("github.com/perses/%s@v%s", repository, version))
	goGetCMD.Dir = workspace
	if err := goGetCMD.Run(); err != nil {
		logrus.WithError(err).WithField("workspace", workspace).Fatal("unable to bump the go dependencies")
	}
	goModTidyCMD := command.Create("go", "mod", "tidy")
	goModTidyCMD.Dir = workspace
	if err := goModTidyCMD.Run(); err != nil {
		logrus.WithError(err).WithField("workspace", workspace).Fatal("unable to run go mod tidy")
	}
	logBumpSuccess("go", workspace, version)
}

func bumpCueDep(workspace, version string, repository string) {
	packageName := "github.com/perses/perses/cue"
	if len(repository) > 0 {
		packageName = fmt.Sprintf("github.com/perses/%s/cue", repository)
	}
	cueModPath := filepath.Join(workspace, "cue.mod", "module.cue")
	data, err := os.ReadFile(cueModPath)
	if err != nil {
		logrus.WithError(err).Errorf("unable to read the file %s", cueModPath)
	}
	if bytes.Contains(data, []byte(packageName)) {
		if cueErr := command.RunInDirectory(workspace, "cue", "mod", "get", fmt.Sprintf("%s@v%s", packageName, version)); cueErr != nil {
			logrus.WithError(cueErr).WithField("workspace", workspace).Fatal("unable to bump the cue dependencies")
		}
		if cueErr := command.RunInDirectory(workspace, "cue", "mod", "tidy"); cueErr != nil {
			logrus.WithError(cueErr).WithField("workspace", workspace).Fatal("unable to run cue mod tidy")
		}
		logBumpSuccess("cue", workspace, version)
	}
}

func replaceNPMPackage(data []byte, version string, componentNames ...string) []byte {
	newData := data
	for _, name := range componentNames {
		bumpNPMDeps := regexp.MustCompile(fmt.Sprintf(`"@perses-dev/%s":\s*"(\^)?[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)\.[0-9]+)?"`, name))
		newData = bumpNPMDeps.ReplaceAll(newData, []byte(fmt.Sprintf(`"@perses-dev/%s": "^%s"`, name, version)))
	}
	return newData
}

func bumpPackage(workspace string, version string, componentNames ...string) {
	pkgPath := filepath.Join(workspace, "package.json")
	data, err := os.ReadFile(pkgPath)
	if err != nil {
		logrus.WithError(err).Fatalf("unable to read the file %s", pkgPath)
	}
	newData := replaceNPMPackage(data, version, componentNames...)
	if writeErr := os.WriteFile(pkgPath, newData, 0644); writeErr != nil {
		logrus.WithError(writeErr).Fatalf("unable to write the file %s", pkgPath)
	}
	logBumpSuccess("package", workspace, version)
}

func bumpPersesDep(workspaces []string, version string) {
	for _, workspace := range workspaces {
		bumpGoDep(workspace, version, "perses")
		bumpCueDep(workspace, version, "perses")
	}
}

func bumpSpecDep(workspaces []string, version string) {
	for _, workspace := range workspaces {
		bumpGoDep(workspace, version, "spec")
		bumpPackage(workspace, version, specPackageNames...)
		bumpCueDep(workspace, version, "spec")
	}
}

func bumpSharedDep(workspaces []string, version string) {
	for _, workspace := range workspaces {
		bumpPackage(workspace, version, sharedPackageNames...)
		bumpCueDep(workspace, version, "shared")
	}
}

// This script bumps all perse-dev and perses shared dependencies for go, cuelang and JavaScript packages to the provided version.
// To be used like that: go run ./scripts/bump-deps/bump-deps.go --version=<version>
// Note: the version provided does not contain the prefix 'v'.
// Example: go run ./scripts/bump-deps/bump-deps.go --version=0.52.0-beta.4 --shared-version=0.10.0 --spec-version=0.1.0
func main() {
	version := flag.String("version", "", "the version to use for the bump.")
	sharedVersion := flag.String("shared-version", "", "the version for the shared component to use for the bump.")
	specVersion := flag.String("spec-version", "", "the version for the spec component to use for the bump.")
	flag.Parse()
	if *version == "" && *sharedVersion == "" && *specVersion == "" {
		logrus.Fatal("you must provide a version to use for the bump")
	}

	workspaces := npm.MustGetWorkspaces(".")
	if *version != "" {
		bumpPersesDep(workspaces, *version)
	}
	if *sharedVersion != "" {
		bumpPackage("", *sharedVersion, sharedPackageNames...)
		bumpSharedDep(workspaces, *sharedVersion)
	}
	if *specVersion != "" {
		bumpPackage("", *specVersion, specPackageNames...)
		bumpSpecDep(workspaces, *specVersion)
	}
	if pnpmErr := command.Run("pnpm", "install"); pnpmErr != nil {
		logrus.WithError(pnpmErr).Fatal("unable to run pnpm install")
	} else {
		logrus.Info("successfully ran pnpm install")
	}
}
