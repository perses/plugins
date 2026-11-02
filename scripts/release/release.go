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

package main

import (
	"errors"
	"flag"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/perses/perses/scripts/pkg/command"
	"github.com/perses/perses/scripts/pkg/npm"
	localNPM "github.com/perses/plugins/scripts/npm"
	"github.com/sirupsen/logrus"
)

const (
	// repository is the GitHub repository in which the releases are created, whatever the default repository of gh is.
	repository = "perses/plugins"
	// sharedPackage is the package of perses/shared whose version defines the release branch of the plugins.
	sharedPackage = "@perses-dev/plugin-system"
)

var (
	versionPattern = regexp.MustCompile(`^(\d+)\.(\d+)\.\d+(?:-[\w.]+)?$`)
	// sharedRangePattern matches the version ranges written by the bump-deps script: ^X.Y.Z or ^X.Y.Z-prerelease.
	sharedRangePattern = regexp.MustCompile(`^[\^~]?(\d+\.\d+\.\d+(?:-[\w.]+)?)$`)
)

type pluginRelease struct {
	// name is the folder name of the plugin.
	name    string
	version string
}

// tag returns the name of the tag of the release. To be compliant with Go modules, it is in the format
// <folder>/vX.Y.Z.
func (r pluginRelease) tag() string {
	return fmt.Sprintf("%s/v%s", r.name, r.version)
}

// isPrerelease follows the same rule as the npm dist-tag: a version with a prerelease suffix (beta, rc...) is a
// prerelease.
func isPrerelease(version string) bool {
	return strings.Contains(version, "-")
}

// minorSeries returns the series (v<major>.<minor>) the given version belongs to.
func minorSeries(version string) (string, error) {
	matches := versionPattern.FindStringSubmatch(version)
	if matches == nil {
		return "", fmt.Errorf("version %q doesn't follow the semver (expected format: X.Y.Z or X.Y.Z-prerelease)", version)
	}
	return fmt.Sprintf("v%s.%s", matches[1], matches[2]), nil
}

// releaseBranch returns the branch from which the plugins depending on the given series of the shared components must
// be released.
func releaseBranch(sharedSeries string) string {
	return "release/" + sharedSeries
}

// parseSharedVersion returns the minimal version of the shared components allowed by the given version range.
func parseSharedVersion(versionRange string) (string, error) {
	matches := sharedRangePattern.FindStringSubmatch(strings.TrimSpace(versionRange))
	if matches == nil {
		return "", fmt.Errorf("unsupported version range %q for %s (expected format: ^X.Y.Z, ~X.Y.Z or X.Y.Z)",
			versionRange, sharedPackage)
	}
	return matches[1], nil
}

// getSharedVersion returns the version of the shared components the plugins depend on, according to the
// devDependencies of the root package.json.
func getSharedVersion(dirPath string) (string, error) {
	versionRange, err := localNPM.GetDevDependency(dirPath, sharedPackage)
	if err != nil {
		return "", fmt.Errorf("reading the version of %s: %w", sharedPackage, err)
	}
	return parseSharedVersion(versionRange)
}

func selectPlugins(workspaces []string, name string, all bool) ([]string, error) {
	switch {
	case all && name != "":
		return nil, errors.New("the flags --all and --name are mutually exclusive")
	case all:
		return workspaces, nil
	case name == "":
		return nil, errors.New("either the flag --all or --name must be set")
	case !slices.Contains(workspaces, name):
		return nil, fmt.Errorf("unknown plugin %q, the flag --name must be the folder name of a plugin", name)
	default:
		return []string{name}, nil
	}
}

// pendingReleases returns the releases of the given plugins that don't exist yet.
func pendingReleases(plugins []string) ([]pluginRelease, error) {
	releases := make([]pluginRelease, 0, len(plugins))
	for _, plugin := range plugins {
		version, err := npm.GetVersion(plugin)
		if err != nil {
			return nil, fmt.Errorf("reading the version of the plugin %s: %w", plugin, err)
		}
		if !versionPattern.MatchString(version) {
			return nil, fmt.Errorf("version %q of the plugin %s doesn't follow the semver", version, plugin)
		}
		release := pluginRelease{name: plugin, version: version}
		if tagExists(release.tag()) {
			logrus.Infof("release %s already exists", release.tag())
			continue
		}
		releases = append(releases, release)
	}
	return releases, nil
}

// checkPrerelease ensures that no plugin is released with a stable version while the shared components it depends on
// are in pre-release (beta, rc...).
func checkPrerelease(releases []pluginRelease, sharedVersion string) error {
	if !isPrerelease(sharedVersion) {
		return nil
	}
	stableReleases := []string{}
	for _, release := range releases {
		if !isPrerelease(release.version) {
			stableReleases = append(stableReleases, release.tag())
		}
	}
	if len(stableReleases) == 0 {
		return nil
	}
	return fmt.Errorf("%s %s is a pre-release, so the plugins must be released as a pre-release (beta, rc...) too: %s",
		sharedPackage, sharedVersion, strings.Join(stableReleases, ", "))
}

// ghReleaseArgs returns the arguments of the gh command creating the GitHub release and its tag on the given commit.
func ghReleaseArgs(release pluginRelease, commit string, notes string) []string {
	tag := release.tag()
	args := []string{"release", "create", tag, "--repo", repository, "--target", commit, "--title", tag}
	if isPrerelease(release.version) {
		args = append(args, "--prerelease")
	}
	return append(args, "--notes", notes)
}

func createRelease(release pluginRelease, commit string, dryRun bool) error {
	notes, err := generateChangelog(release)
	if err != nil {
		return err
	}
	args := ghReleaseArgs(release, commit, notes)
	if dryRun {
		logrus.Infof("[dry-run] creating the release: `gh %s`", strings.Join(args, " "))
		return nil
	}
	logrus.Infof("creating the release %s on the commit %s", release.tag(), commit)
	if err := command.Run("gh", args...); err != nil {
		return fmt.Errorf("creating the release %s: %w", release.tag(), err)
	}
	logrus.Infof("✓ successfully created the release %s", release.tag())
	return nil
}

type options struct {
	all    bool
	name   string
	remote string
	dryRun bool
}

func run(opts options) error {
	workspaces, err := localNPM.GetWorkspaces(".")
	if err != nil {
		return fmt.Errorf("reading the workspaces: %w", err)
	}
	plugins, err := selectPlugins(workspaces, opts.name, opts.all)
	if err != nil {
		return err
	}

	sharedVersion, err := getSharedVersion(".")
	if err != nil {
		return err
	}
	sharedSeries, err := minorSeries(sharedVersion)
	if err != nil {
		return fmt.Errorf("%s: %w", sharedPackage, err)
	}
	logrus.Infof("the plugins depend on %s %s, they are released from the branch %s",
		sharedPackage, sharedVersion, releaseBranch(sharedSeries))

	// get all tags
	if err := command.Run("git", "fetch", "--tags", opts.remote); err != nil {
		return fmt.Errorf("fetching the tags from the remote %s: %w", opts.remote, err)
	}
	releases, err := pendingReleases(plugins)
	if err != nil {
		return err
	}
	if len(releases) == 0 {
		logrus.Info("nothing to release")
		return nil
	}
	if err := checkPrerelease(releases, sharedVersion); err != nil {
		return err
	}
	commit, err := releaseCommit(sharedSeries, opts.remote)
	if err != nil {
		return err
	}

	for _, release := range releases {
		if err := createRelease(release, commit, opts.dryRun); err != nil {
			return err
		}
	}
	return nil
}

// This script generates GitHub release(s) of the plugins.
//
// The release cycle of the plugins follows the one of the shared components (perses/shared): the plugins are released
// from the branch release/v<major>.<minor>, where <major>.<minor> is the version of @perses-dev/plugin-system declared
// in the devDependencies of the root package.json (and not the version of the plugins).
//
// Prerequisites for running this script:
// - Install the GitHub CLI (gh): https://github.com/cli/cli#installation
// - Use it to log in to GitHub: `gh auth login`
// - Checkout the release branch matching the version of the shared components, and make sure it is in sync with the
// remote.
//
// Usage:
//
// This will release every plugin not yet released:
//
//	go run ./scripts/release --all
//
// This will release only the tempo plugin (note that the `--name` flag is set with the folder name not the plugin name):
//
//	go run ./scripts/release --name=tempo
//
// Add the flag `--dry-run` to only print the releases that would be created.
//
// NB: this script doesn't handle the plugin archive creation, a CI task achieves this once the GitHub release is
// published.
func main() {
	all := flag.Bool("all", false, "release all the plugins not yet released")
	name := flag.String("name", "", "release a single plugin (folder name of the plugin)")
	remote := flag.String("remote", "origin", "name of the git remote pointing to the perses/plugins repository")
	dryRun := flag.Bool("dry-run", false, "do not perform any changes, only print what would be done")
	flag.Parse()

	opts := options{
		all:    *all,
		name:   *name,
		remote: *remote,
		dryRun: *dryRun,
	}
	if err := run(opts); err != nil {
		logrus.WithError(err).Fatal("unable to release the plugins")
	}
}
