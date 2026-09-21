# Release process

## Pre-requisites

### Release cycle consistency

All plugins depend on the plugin-system coming from the [perses/shared](https://github.com/perses/shared) repository.
As soon as the plugin-system is starting a new release cycle (usually with a beta), **releasing of the plugin will have
to follow the same identifier**. Meaning you will have to start a new release cycle for all plugins starting with a beta.

You **MUST NOT** cut a new minor release of a plugin if it depends on the plugin-system in beta/rc.

### General comment about updating dependencies

This plugins repository has several dependencies, not always materialized. For example, @perses-dev/plugin-system comes
from [perses/shared](https://github.com/perses/shared) repository.
To update dependencies, it is recommended to follow these rules:
- do it in a separate pull request to not put at risk the release of a plugin with other changes;
- use the [bump-deps.go script](./scripts/bump-deps/bump-deps.go) (see instructions there)

## How to cut a release

To release a new version of one or multiple plugins, you should:

1. Checkout to a new branch
2. Update the version number in its (their) respective `package.json` file (s).
   - Use [bump-plugin.go script](./scripts/bump-plugin/bump-plugin.go) (see instructions there).
3. Run `npm install` at the root of the repo to propagate this update to the root `package-lock.json`.
4. Commit these changes - as a standalone commit ("Prepare \<plugin\> release vX.Y.Z") or as part of your changes.
5. Push the changes (new version (s)) and create a PR.
6. After the PR is merged, checkout to and update the main.
7. Run [release.go](./scripts/release/release.go) (see instructions there).

Further actions will then be triggered on GitHub side (see release stage in the [CI](./.github/workflows/ci.yml)).
