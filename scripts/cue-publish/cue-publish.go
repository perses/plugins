package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/perses/plugins/scripts/command"
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
