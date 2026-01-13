// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/perses/perses/scripts/pkg/command"
	"github.com/perses/plugins/scripts/tag"
	"github.com/sirupsen/logrus"
)

const modulePrefix = "github.com/perses/plugins"

func main() {
	token := flag.String("token", "", "Authentication token for CUE Central Registry login")
	t := tag.Flag()
	flag.Parse()

	if *token == "" {
		logrus.Fatal("Error: -token flag is required")
	}
	if *t == "" {
		logrus.Fatal("Error: -tag flag is required")
	}

	pluginName, version := tag.Parse(t)
	version = "v" + version
	module := fmt.Sprintf("%s/%s@%s", modulePrefix, pluginName, version)

	logrus.Infof("Module to be released: %s", module)

	if err := os.Chdir(pluginName); err != nil {
		logrus.WithError(err).Fatalf("Error moving to the plugin directory: %s", pluginName)
	}

	logrus.Info("Logging into the CUE Central Registry...") // still required to push new modules
	if err := command.Run("cue", "login", "--token="+*token); err != nil {
		logrus.WithError(err).Fatal("Error logging into CUE Central Registry")
	}

	logrus.Info("Ensuring the module is tidy...")
	if err := command.Run("cue", "mod", "tidy"); err != nil {
		logrus.WithError(err).Fatal("Error ensuring the module is tidy")
	}

	logrus.Info("Publishing module...")
	if err := command.Run("cue", "mod", "publish", version); err != nil {
		logrus.WithError(err).Fatal("Error publishing module")
	}

	logrus.Infof("CUE module %s published successfully", module)
}
