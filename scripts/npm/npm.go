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

package npm

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"

	"github.com/perses/perses/scripts/pkg/npm"
	"github.com/sirupsen/logrus"
)

var excludedWorkspaces = []string{"e2e"}

// GetWorkspaces returns the plugin workspaces declared in the package.json of dirPath.
func GetWorkspaces(dirPath string) ([]string, error) {
	workspaces, err := npm.GetWorkspaces(dirPath)
	if err != nil {
		return nil, err
	}
	return slices.DeleteFunc(workspaces, func(w string) bool {
		return slices.Contains(excludedWorkspaces, w)
	}), nil
}

func MustGetWorkspaces(dirPath string) []string {
	workspaces, err := GetWorkspaces(dirPath)
	if err != nil {
		logrus.WithError(err).Fatal("unable to read workspaces from package.json")
	}
	return workspaces
}

// GetDevDependency returns the version range of the given package declared in the devDependencies of the package.json
// of dirPath.
func GetDevDependency(dirPath string, name string) (string, error) {
	pkgPath := filepath.Join(dirPath, "package.json")
	data, err := os.ReadFile(pkgPath) //nolint: gosec
	if err != nil {
		return "", err
	}
	var pkg struct {
		DevDependencies map[string]string `json:"devDependencies"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return "", fmt.Errorf("parsing %s: %w", pkgPath, err)
	}
	versionRange, ok := pkg.DevDependencies[name]
	if !ok {
		return "", fmt.Errorf("%s is not declared in the devDependencies of %s", name, pkgPath)
	}
	return versionRange, nil
}
