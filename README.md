# Perses Plugins

This repository contains the core plugins for [Perses](https://github.com/perses/perses)

## Build locally

### Get plugin schemas dependencies

Most if not all the plugins schemas rely on the [`common` CUE package of the perses/perses repo](https://github.com/perses/perses/tree/main/cue/schemas/common). To be able to evaluate the CUE model of a given plugin locally, you thus need to make this package available as en external CUE dependency for it. In the future this is something where you'd just have to run `cue get` (in the same way as `go get` for Golang libs), but for now you have to rely on an utility we provide through percli: `percli plugin update`.

## Development

The instructions are for the `Table` plugin, replace the name accordingly.

1. Install Cue deps with `go run ./scripts/get-schemas-deps/get-schemas-deps.go`
2. Start development server of the plugin: `cd Table; npm run dev`
3. Update the Perses configuration `config.yaml` to use development server for this plugin:
   ```yaml
   plugin:
     dev_environment:
       plugins:
         - name: Table
           disable_schema: false
           url: http://localhost:3005
           absolute_path: /absolute/path/to/plugin/repository/table
   ```
4. Start Perses backend (in `perses` repository): `./scripts/api_backend_dev.sh`
5. Start Perses frontend (in `perses` repository): `cd ui; npm run start`
