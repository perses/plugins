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

package npm

import (
	"encoding/json"
	"os"
	"path"
	"path/filepath"
)

type Package struct {
	Version    string   `json:"version"`
	Workspaces []string `json:"workspaces"`
}

func GetVersion(pluginPath string) (string, error) {
	data, err := os.ReadFile(filepath.Join(pluginPath, "package.json"))
	if err != nil {
		return "", err
	}
	pkg := Package{}
	if unmarshalErr := json.Unmarshal(data, &pkg); unmarshalErr != nil {
		return "", unmarshalErr
	}
	return pkg.Version, nil
}

func GetWorkspaces() ([]string, error) {
	data, err := os.ReadFile("package.json")
	if err != nil {
		return nil, err
	}
	pkg := Package{}
	if unmarshalErr := json.Unmarshal(data, &pkg); unmarshalErr != nil {
		return nil, unmarshalErr
	}
	return pkg.Workspaces, nil
}

type BuildInfo struct {
	Version string `json:"buildVersion"`
	Name    string `json:"buildName"`
}

type Metadata struct {
	BuildInfo BuildInfo `json:"buildInfo"`
}

type Manifest struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Metadata Metadata `json:"metaData"`
}

func ReadManifest(pluginPath string) (*Manifest, error) {
	manifestFilePath := path.Join(pluginPath, "dist", "mf-manifest.json")
	data, err := os.ReadFile(manifestFilePath)
	if err != nil {
		return nil, err
	}
	manifestData := &Manifest{}
	return manifestData, json.Unmarshal(data, manifestData)
}
