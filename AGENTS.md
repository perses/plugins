# AI contributor guide

## Purpose and instruction scope

This repository contains the official Perses plugins. Each lower-case top-level plugin directory is an independently
published workspace that can include a TypeScript runtime, CUE schemas, a Go SDK, documentation, and tests. Keep those
representations coherent and preserve the contracts consumed by Perses installations and dashboards.

Before editing:

- Read `README.md` and `.github/pull_request_template.md` for repository and pull-request conventions.
- Read the affected plugin's `README.md`, `package.json`, and neighboring implementations.
- For TypeScript or React work, also follow `STYLEGUIDE.md`.

## Architecture map

- `<plugin>/src/`: plugin runtime and editor UI. `getPluginModule.ts` is normally the public registration boundary.
- `<plugin>/schemas/`: CUE definitions for plugin configuration and data models.
- `<plugin>/sdk/`: public Go builders and helpers for Dashboard-as-Code users.
- `<plugin>/cue.mod/`: CUE module metadata and dependencies.
- `e2e/`: Playwright coverage for integrated plugin behavior.
- `scripts/` and the root `Makefile`: plugin validation, generation, packaging, schema tests, and documentation checks.
- Upper-case plugin directories, `dist/`, `.turbo/`, `node_modules/`, and `cue.mod/pkg/` are generated or downloaded
  outputs. Do not edit or commit them unless a documented release process explicitly requires it.

Reusable UI primitives and plugin APIs belong in `perses/shared`; canonical resource contracts belong in `perses/spec`.
Consume their public exports instead of copying their internals or deep-importing source files.

## Engineering rules

- Make a plugin change across every affected representation: runtime, editor, schema, Go SDK, docs, examples, and tests.
- Preserve plugin names, kinds, package metadata, serialized field names, defaults, and schema compatibility unless a
  breaking change is explicit and documented.
- Keep runtime modules focused on registering a plugin. Put substantial UI and data logic in cohesive components,
  hooks, and utilities within the plugin workspace.
- Never hand-edit generated or built output. Update the source and use the repository generator or build command.
- New source files need the repository's Apache license header.
- Do not bump package versions, peer ranges, or shared dependencies unless the task explicitly requires it.
- Do not raise lint warning ceilings or add broad suppressions. New code must not add Oxlint warnings.
- Update user-facing documentation when configuration, defaults, queries, transformations, or visual behavior changes.

## Validation

Use Go 1.26.x, Node.js from `.nvmrc`, and npm from `package.json`. While iterating, run the affected workspace first:

```sh
npm ci
npm run lint -w <workspace>
npm run type-check -w <workspace>
npm run test -w <workspace>
```

Before completion of a TypeScript change, run the relevant repository checks:

```sh
npm run lint
npm run format:check
npm run type-check
npm run test
```

For schema, SDK, or repository-wide changes, select the relevant Make targets:

```sh
make lint-plugins
make test-schemas-plugins
make golangci-lint
make checkformat-cue
make test
make checklicense
make checkdocs
```

Run Playwright tests when a plugin contract, editor workflow, fixture, or integrated browser behavior changes. Some
broad targets require CUE, Go tooling, built packages, or linked Perses repositories; report unavailable prerequisites
rather than weakening validation.

## Completion checklist

- Runtime, schema, SDK, documentation, and examples remain aligned where applicable.
- Public package and persisted-dashboard compatibility has been considered.
- New behavior and important failures have focused test coverage.
- Relevant lint, format, type, test, CUE, Go, E2E, and documentation checks pass.
- The final diff contains no build output, credentials, warning-ceiling increases, version bumps, or unrelated edits.
