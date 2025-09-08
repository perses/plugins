# Release process

To release a new version of one or multiple plugins, you should:

1. Checkout to a new branch
2. Update the version number in its(their) respective `package.json` file(s).
3. Run `npm install` at the root of the repo to propagate this update to the root `package-lock.json`.
4. Commit these changes - as a standalone commit ("Prepare \<plugin\> release vX.Y.Z") or as part of your changes.
5. Push your changes and create a PR to have the new versions merged
6. Checkout to the main branch
7. Get the recent changes

> ⚠️ If you are using a fork you can

```bash
git checkout main
git fetch upstream
git rebase upstream/main
```

8. Run [release.go](./scripts/release/release.go) (see instructions there).

Further actions will then be triggered on GitHub side (see release stage in the [CI](./.github/workflows/ci.yml)).

No automatic changelog generation, you can always edit the description of the generated release(s) if you want.
