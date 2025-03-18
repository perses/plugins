# Perses Plugins

This repository contains the core plugins for [Perses](https://github.com/perses/perses)

## Development

The instructions are for the `Table` plugin, replace the name accordingly.

1. As a pre-requisite, `get-schemas-deps.go` relies on `percli` to be a part of your \$PATH variable.
    1. Build the `perses` project. This will generate the `percli` in the bin directory of the project.
    2. Add `/absolute/path/to/percli/` to your \$PATH variable.
2. Install Cue deps with `go run ./scripts/get-schemas-deps/get-schemas-deps.go`
3. Start development server of the plugin: `cd Table; npm run dev`
4. Update the Perses configuration `config.yaml` to use development server for this plugin:
   ```yaml
   plugin:
     dev_environment:
       plugins:
         - name: Table
           disable_schema: false
           url: http://localhost:3005
           absolute_path: /absolute/path/to/plugin/repository/table
   ```
5. Start Perses backend (in `perses` repository): `./scripts/api_backend_dev.sh`
6. Start Perses frontend (in `perses` repository): `cd ui; npm run start`
