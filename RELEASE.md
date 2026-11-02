# Release process

## Pre-requisites

### Release cycle consistency

All plugins depend on the plugin-system coming from the [perses/shared](https://github.com/perses/shared) repository.
The release cycle of the plugins therefore follows the one of the shared libraries (which itself follows the
[Perses release cycle](https://github.com/perses/perses/blob/main/RELEASE.md)).

As soon as the plugin-system is starting a new release cycle (usually with a beta), **releasing of the plugins will
have to follow the same identifier**. Meaning you will have to start a new release cycle for all plugins starting with a
beta.

You **MUST NOT** release a stable version of a plugin if it depends on the plugin-system in beta/rc. The
[release.go script](./scripts/release/release.go) refuses to do it.

### General comment about updating dependencies

This plugins repository has several dependencies, not always materialized. For example, @perses-dev/plugin-system comes
from [perses/shared](https://github.com/perses/shared) repository.
To update dependencies, it is recommended to follow these rules:
- do it in a separate pull request to not put at risk the release of a plugin with other changes;
- use the [bump-deps.go script](./scripts/bump-deps/bump-deps.go) (see instructions there)

## Branch management and versioning strategy

We use [Semantic Versioning](https://semver.org/). Each plugin has its own version and is released independently. To be
compliant with Go modules, the tag of a plugin release is `<plugin folder>/v<version>` (for example `tempo/v0.61.0`).

The current flow is to merge new features and bugfixes into the `main` branch.

Like [perses/perses](https://github.com/perses/perses) and [perses/shared](https://github.com/perses/shared), the plugins
are released from a release branch, so that they can be patched. As the plugins have different versions, **the release
branch follows the version of the shared libraries, not the one of the plugins**: it is named
`release/v<major>.<minor>`, where `<major>.<minor>` is the version of `@perses-dev/plugin-system` declared in the
`devDependencies` of the root [package.json](./package.json).

For example, while the plugins depend on `@perses-dev/plugin-system` `^0.56.0-beta.0`, every plugin (e.g. tempo
`0.61.0-beta.1` or prometheus `0.60.0-beta.1`) is released from the branch `release/v0.56`. All the releases (beta,
release candidate, final and patch releases) of the plugins depending on the v0.56 series of the shared libraries are
cut from this branch.

> ⚠️ Do not create a release branch per plugin or per plugin version. There is a single release branch per release
> series of the shared libraries.

On a release branch, the shared dependencies can only be bumped within the same series (e.g. from `0.56.0-rc.0` to
`0.56.0`). Moving to a new series of the shared libraries (e.g. `0.57.0-beta.0`) happens on `main` and requires a new
release branch.

Note for the release shepherd:

- To simplify the work and the coordination around the release, when you are still cutting beta releases, you can
  simply merge the branch `main` into the release branch.
- When you reach the release candidate stage, stop doing that to avoid introducing new features or enhancements that
  might cause instability and delay the final release. Instead, ask contributors and maintainers to target the release
  branch when opening a PR that fixes a bug.
- Only bugfixes can be accepted when you are cutting release candidates.

## How to cut a release

### 1. Create the release branch

This step is only required once per release series of the shared libraries, before cutting the first plugin release of
the series.

1. Once the shared libraries have released the first version of the series (usually `v<major>.<minor>.0-beta.0`), bump
   the shared dependencies on `main` in a dedicated pull request, using the
   [bump-deps.go script](./scripts/bump-deps/bump-deps.go). For example:
   `go run ./scripts/bump-deps --shared-version=0.57.0-beta.0`.
2. Once this pull request is merged, create the release branch from the latest commit of the `main` branch and push it
   to GitHub:

```bash
git checkout main
git pull origin main
git checkout -b release/v<major>.<minor>
git push origin release/v<major>.<minor>
```

### 2. Prepare your release

1. Create a branch based on the release branch `release/v<major>.<minor>`. This branch should use the naming pattern
   `<yourname>/release-<plugin>-v<version>` (or `<yourname>/release-plugins-v<major>.<minor>` when releasing all the
   plugins).
2. Update the version number in the `package.json` file of the plugin(s) to release, using the
   [bump-plugin.go script](./scripts/bump-plugin/bump-plugin.go) (see instructions there). For example:
   - first beta of a release cycle: `go run ./scripts/bump-plugin --all --type preminor --preid beta`
   - following betas: `go run ./scripts/bump-plugin --all --type prerelease --preid beta`
   - release candidates: `go run ./scripts/bump-plugin --all --type prerelease --preid rc`
   - final release: `go run ./scripts/bump-plugin --all --type minor`
   - patch release of a single plugin: `go run ./scripts/bump-plugin --name=tempo --type patch`
3. Run `npm install` at the root of the repo to propagate this update to the root `package-lock.json`.
4. Commit these changes - as a standalone commit ("Prepare \<plugin\> release vX.Y.Z") or as part of your changes.
5. Push the branch to GitHub and create a pull request with the release branch `release/v<major>.<minor>` as the base.
6. Once the pull request is approved, merge it into the release branch.

### 3. Create the release(s)

Prerequisites: install the [GitHub CLI](https://github.com/cli/cli#installation) and log in with `gh auth login`.

Pull down the latest updates of the release branch, then run [release.go](./scripts/release/release.go):

```bash
git checkout release/v<major>.<minor>
git pull origin release/v<major>.<minor>
go run ./scripts/release --all --dry-run # optional, only prints the releases that would be created
go run ./scripts/release --all           # release every plugin not yet released
go run ./scripts/release --name=tempo    # or release a single plugin (folder name of the plugin)
```

The script:

- reads the version of `@perses-dev/plugin-system` in the root `package.json` and verifies that you are on the
  matching release branch and that your local branch is in sync with the remote. If your remote pointing to
  `perses/plugins` isn't named `origin`, use the flag `--remote <name>`.
- skips the plugins whose version has already been released.
- refuses to release a stable version of a plugin when the plugin-system version is a beta or a release candidate.
- creates, for each plugin to release, the GitHub release and the tag `<plugin folder>/v<version>` on the latest commit
  of the release branch. The release notes are generated from the commits mentioning the plugin since its previous tag
  (looking first at the tags of the same minor version of the plugin). Beta and release candidate versions are marked
  as pre-releases.

Publishing a GitHub release then triggers the automated release process of the plugin via GitHub Actions (see the
release stage in the [CI](./.github/workflows/ci.yml)):

- Building the plugin archive and uploading it to the GitHub release.
- Publishing the CUE module to the Central Registry.
- Publishing the npm package. Final and patch versions are published with the npm dist-tag `latest`, beta and release
  candidate versions with the dist-tag `prerelease`.

Please verify that the GitHub Actions complete successfully. If you realize we need to adjust something in the release
notes, you can edit it directly in the GitHub UI.

### 4. Merge the release branch into `main`

The release branch must not be deleted, so that patch releases can be cut from it.

During the release cycle, especially when cutting release candidates, you will have to merge the release branch into
`main` in order to bring the bugfixes and the new plugin versions back to `main`.

1. You can simply open a pull request to merge the release branch into `main`. This is only acceptable if there is no
   conflict.
2. In case of conflicts, create another branch based on the release branch, resolve the conflicts, and open a pull
   request from your branch targeting `main`.

When this pull request is approved, merge it into `main` ⚠️ **using the "merge pull request" option, not "squash and
merge"**.

You **MUST NOT** squash the release branch into `main`, otherwise the commits that have been tagged disappear from the
`main` history.

## Patch release

Patch releases of a plugin are cut from the release branch of the shared libraries series it depends on. For example,
to patch the plugins depending on the v0.56 series of the shared libraries, use the branch `release/v0.56`:

1. Open the pull requests fixing the issues against the release branch.
2. Follow the steps 2 to 4 above.

Note: final and patch versions are published with the npm dist-tag `latest`. Do not cut a patch release of a plugin on
an older release branch once a newer version of this plugin has reached its final release, otherwise the dist-tag
`latest` would move back to the older version.
