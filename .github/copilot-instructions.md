# Perses plugins repository instructions

Follow [`AGENTS.md`](../AGENTS.md) for architecture, validation, compatibility, and completion requirements. For every
TypeScript or React file, also follow the path-specific UI instructions in `.github/instructions/ui.instructions.md`.

- Treat each lower-case top-level directory as a cohesive, independently published plugin workspace.
- Keep runtime code, editor UI, CUE schema, Go SDK, documentation, examples, and tests aligned when a contract changes.
- Preserve plugin identities, serialized fields, defaults, package metadata, and public APIs unless a breaking change is
  explicitly requested.
- Use public exports from `@perses-dev/*`; do not deep-import other repositories or duplicate shared contracts.
- Do not edit upper-case built plugin directories, `dist/`, `cue.mod/pkg/`, or other generated output.
- Add focused tests, Apache headers on new source files, and run the affected workspace checks before root checks.
- Do not add Oxlint warnings, raise warning ceilings, use broad suppressions, or change dependency versions without a
  task-specific reason.
