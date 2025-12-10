package main

import (
	"os"
	"os/exec"

	"github.com/perses/perses/scripts/pkg/npm"
	"github.com/sirupsen/logrus"
)

func main() {
	var isError bool

	for _, workspace := range npm.MustGetWorkspaces(".") {
		cmd := exec.Command("golangci-lint", "run")
		cmd.Dir = workspace
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if execErr := cmd.Run(); execErr != nil {
			isError = true
			logrus.WithError(execErr).Errorf("issue with golangci for the plugin %s", workspace)
		} else {
			logrus.Infof("golangci-lint passed for the plugin %s", workspace)
		}
	}
	if isError {
		logrus.Fatal("some plugins failed the golangci-lint check")
	} else {
		logrus.Info("all plugins passed the golangci-lint check")
	}
}
