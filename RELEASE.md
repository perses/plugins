# Release process

To release a new version of one or multiple plugins, you should:
1. update the version number in its(their) respective `package.json` file(s)
2. commit
3. run [release.go](./scripts/release/release.go).

The script will then trigger further actions on github side (see release stage in the [CI](./.github/workflows/ci.yml))
