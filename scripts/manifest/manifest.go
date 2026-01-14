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

package manifest

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/sirupsen/logrus"
)

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

func Read(pluginPath string) (*Manifest, error) {
	manifestFilePath := filepath.Join(pluginPath, "dist", "mf-manifest.json")
	data, err := os.ReadFile(manifestFilePath)
	if err != nil {
		return nil, err
	}
	manifestData := &Manifest{}
	return manifestData, json.Unmarshal(data, manifestData)
}

func MustRead(pluginPath string) *Manifest {
	manif, err := Read(pluginPath)
	if err != nil {
		logrus.WithError(err).Fatalf("unable to read manifest file for plugin %s", pluginPath)
	}
	return manif
}
