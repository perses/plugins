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
	"bytes"
	"errors"
	"fmt"
	"os/exec"
	"strings"

	"github.com/perses/perses/scripts/pkg/command"
	"github.com/perses/perses/scripts/pkg/git"
)

// gitOutput runs git with the given arguments and returns its trimmed standard output.
// On failure, the returned error contains the standard error of git.
func gitOutput(args ...string) (string, error) {
	data, err := exec.Command("git", args...).Output()
	if err == nil {
		return strings.TrimSpace(string(data)), nil
	}
	cmdLine := "git " + strings.Join(args, " ")
	if exitErr, ok := errors.AsType[*exec.ExitError](err); ok && len(bytes.TrimSpace(exitErr.Stderr)) > 0 {
		return "", fmt.Errorf("%s: %w: %s", cmdLine, err, bytes.TrimSpace(exitErr.Stderr))
	}
	return "", fmt.Errorf("%s: %w", cmdLine, err)
}

func tagExists(tag string) bool {
	_, err := gitOutput("rev-parse", "--verify", "--quiet", "refs/tags/"+tag)
	return err == nil
}

// releaseCommit returns the commit to tag: the HEAD of the release branch matching the given series of the shared
// components. The local branch must be in sync with the remote, as the changelog is generated from the local history.
func releaseCommit(sharedSeries string, remote string) (string, error) {
	branch := releaseBranch(sharedSeries)
	if current := git.CurrentBranch(); current != branch {
		return "", fmt.Errorf("the plugins depending on the shared components %s must be released from the branch %s, "+
			"but the current branch is %q", sharedSeries, branch, current)
	}

	// Fetch the branch with an explicit refspec: the configured one may not cover it (e.g. single-branch clone).
	remoteRef := fmt.Sprintf("refs/remotes/%s/%s", remote, branch)
	refspec := fmt.Sprintf("+refs/heads/%s:%s", branch, remoteRef)
	if err := command.Run("git", "fetch", "--quiet", remote, refspec); err != nil {
		return "", fmt.Errorf("unable to fetch the branch %s from the remote %s (not pushed?): %w", branch, remote, err)
	}

	localCommit, err := gitOutput("rev-parse", "HEAD")
	if err != nil {
		return "", err
	}
	remoteCommit, err := gitOutput("rev-parse", "--verify", remoteRef)
	if err != nil {
		return "", err
	}
	if localCommit != remoteCommit {
		return "", fmt.Errorf("the local branch %s (%s) is not in sync with %s/%s (%s)",
			branch, localCommit, remote, branch, remoteCommit)
	}
	return localCommit, nil
}
