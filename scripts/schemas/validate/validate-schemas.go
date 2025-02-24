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

package main

import (
	"fmt"
	"os"
	"path/filepath"

	"cuelang.org/go/cue/load"
	"github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

const schemasPath = "schemas"

// check that the CUE schemas for a given plugin are valid (= not raising errors)
func validateSchema(path string) error {
	// load the cue files into build.Instances slice
	// package `model` is imposed so that we don't mix model-related files with migration-related files
	buildInstances := load.Instances([]string{}, &load.Config{Dir: path, Package: "model"})
	// we strongly assume that only 1 buildInstance should be returned, otherwise we skip it
	// TODO can probably be improved
	if len(buildInstances) != 1 {
		return fmt.Errorf("the number of build instances is != 1")
	}
	buildInstance := buildInstances[0]

	// check for errors on the instances
	if buildInstance.Err != nil {
		return buildInstance.Err
	}

	return nil
}

func validateSchemas(pluginName string) error {
	schPath := filepath.Join(pluginName, schemasPath)
	files, err := os.ReadDir(schPath)
	if err != nil {
		return err
	}
	for _, file := range files {
		currentPath := schPath
		if file.IsDir() {
			if file.Name() == "migrate" {
				continue
			}
			currentPath = filepath.Join(currentPath, file.Name())
		}
		if schemaErr := validateSchema(currentPath); schemaErr != nil {
			return schemaErr
		}
	}
	return nil
}

func main() {
	workspaces, err := npm.GetWorkspaces()
	if err != nil {
		logrus.WithError(err).Fatal("unable to get the list of the workspaces")
	}
	for _, workspace := range workspaces {
		logrus.Infof("validate the CUE schemas for the plugin %s", workspace)
		if validateSchemaErr := validateSchemas(workspace); validateSchemaErr != nil {
			logrus.WithError(validateSchemaErr).Fatalf("schema validation failed for the plugin %s", workspace)
		}
	}
}
