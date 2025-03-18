package main

import (
	"bytes"
	"flag"
	"fmt"
	"os"
	"os/exec"

	"github.com/perses/plugins/scripts/tag"
	"github.com/sirupsen/logrus"
)

const modulePrefix = "github.com/perses/plugins"

func runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to run %s %v: %w\nstderr: %s", name, args, err, stderr.String())
	}
	return nil
}

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

	logrus.Info("Logging into the CUE Central Registry...")
	if err := runCommand("cue", "login", "--token="+*token); err != nil {
		logrus.WithError(err).Fatal("Error logging into CUE Central Registry")
	}

	logrus.Info("Ensuring the module is tidy...")
	if err := runCommand("cue", "mod", "tidy"); err != nil {
		logrus.WithError(err).Fatal("Error ensuring the module is tidy")
	}

	logrus.Info("Publishing module...")
	if err := runCommand("cue", "mod", "publish", version); err != nil {
		logrus.WithError(err).Fatal("Error publishing module")
	}

	logrus.Infof("CUE module %s published successfully", module)
}
