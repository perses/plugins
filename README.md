# Perses Plugins

This repository contains the core plugins for [Perses](https://github.com/perses/perses)

## Development

As prerequisites, you need:

- NodeJS [version 24 or greater](https://nodejs.org/).
- pnpm [version 12](https://pnpm.io/installation).

You should first run `pnpm install` at the root of the repository.

Then in [`perses`](https://github.com/perses/perses) repository:

1. Update the Perses configuration `config.yaml` to use development server for this plugin:

   ```yaml
   plugin:
     enable_dev: true
   ```

2. Start the backend: `./scripts/api_backend_dev.sh`
3. Login percli to the backend `percli login http://localhost:8080`
4. Start the plugin development server: `percli plugin start /path/to/the/plugin/dir`

### Code quality

Run `pnpm lint` for the regular Oxlint checks, including the React Doctor rules configured in `.oxlintrc.json`. Run
`pnpm doctor` for the full React Doctor project scan. Pull requests and pushes to `main` also run the scan in GitHub
Actions.

### Working with Snapshots

This will allow you to use the updates from perses core in your plugin so you can test the changes.

1. In perses/shared create a [snapshot](https://github.com/perses/perses/blob/30758a963337564ab58c78646a1134e51d74e146/RELEASE.md?plain=1#L109-L146). Snapshots will be released to the npm registry:
- https://www.npmjs.com/package/@perses-dev/components/
- https://www.npmjs.com/package/@perses-dev/plugin-system
- https://www.npmjs.com/package/@perses-dev/dashboards
- https://www.npmjs.com/package/@perses-dev/explore

2. Copy the name of your snapshot, for example `v0.0.0-snapshot-panel-actions-520389b`.

3. In perses/plugin, navigate to the plugin you are changing and install the snapshot packages. They should be installed as "dependencies", not "peerDependencies", for example:

```
# perses/plugins/timeserieschart/package.json

"dependencies": {
    "color-hash": "^2.0.2"
+   "@perses-dev/components": "v0.0.0-snapshot-panel-actions-520389b",
+   "@perses-dev/plugin-system": "v0.0.0-snapshot-panel-actions-520389b"
  },
  "peerDependencies": {
    "@emotion/react": "^11.7.1",
    "@emotion/styled": "^11.6.0",
    "@hookform/resolvers": "^3.2.0",
-   "@perses-dev/components": "^0.51.0-rc.1",
-   "@perses-dev/plugin-system": "^0.51.0-rc.1",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "echarts": "5.5.0",
    "lodash": "^4.17.21",
    "react": "^17.0.2 || ^18.0.0",
    "react-dom": "^17.0.2 || ^18.0.0",
    "use-resize-observer": "^9.0.0",
    "immer": "^10.1.1"
  }
```

4. Then run `pnpm install` on the plugin folder to update the dependencies of your plugin (e.g., `cd perses/plugins/timeserieschart && pnpm install`).
