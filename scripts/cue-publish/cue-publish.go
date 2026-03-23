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
	"math/rand/v2"
	"os"
	"time"

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
	// When we are releasing multiple modules in a short time span, the CUE Central Registry may block us because they consider we are spamming them.
	// To mitigate this, we implement a retry mechanism.
	retryMaxAttempts := 10
	// Initial sleep duration between retries: random value between 1s and 10s
	sleepBetweenRetries := (1 + time.Duration(rand.Int64N(9))) * time.Second
	for attempt := 1; attempt <= retryMaxAttempts; attempt++ {
		// Wait for a few seconds immediately before the first attempt to reduce collision risk with other jobs running in parallel.
		time.Sleep(sleepBetweenRetries)
		err := command.Run("cue", "mod", "publish", version)
		if err == nil {
			break
		}
		if attempt == retryMaxAttempts {
			logrus.Fatal("Max retry attempts reached, publish process failed")
		}
		logrus.WithError(err).Warnf("Attempt %d/%d: Error publishing the module, retrying...", attempt, retryMaxAttempts)
		// Increase the sleep duration for the next attempt with a random value to reduce collision risk with other jobs running in parallel.
		sleepBetweenRetries = sleepBetweenRetries + (1+time.Duration(rand.Int64N(19)))*time.Second
	}
	logrus.Infof("CUE module %s published successfully", module)
}
