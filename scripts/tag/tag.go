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

package tag

import (
	"flag"
	"regexp"

	"github.com/sirupsen/logrus"
)

var tagNamePattern = regexp.MustCompile(`(?m)(.+)/v(\d+\.\d+\.\d+(?:-[\w\d.]+)?)`)

func Flag() *string {
	return flag.String("tag", "", "Name of the tag")
}

func Parse(tag *string) (string, string) {
	tagSplit := tagNamePattern.FindStringSubmatch(*tag)
	if len(tagSplit) != 3 {
		logrus.Fatalf("Invalid tag name: %s", *tag)
	}
	pluginFolderName := tagSplit[1]
	version := tagSplit[2]
	return pluginFolderName, version
}
