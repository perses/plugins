# Perses Plugins

This repository contains the core plugins for [Perses](https://github.com/perses/perses)

## Development

As prerequisites, you need:
- NodeJS [version 22 or greater](https://nodejs.org/).
- npm [version 10 or greater](https://www.npmjs.com/).
- ⚠️ if the plugin's schema depends on the `github.com/perses/perses/cue` module, you have to authenticate to CUE's Central Registry with `cue login` to be allowed to retrieve dependencies.

You should first run `npm install` at the root of the repository.

Then below instructions are for the individual case of `Table` plugin (change the name accordingly to contribute on another plugin):

First in this repository:
1. Start development server of the plugin: `cd table; npm run dev`

Then in [`perses`](https://github.com/perses/perses) repository:
1. Update the Perses configuration `config.yaml` to use development server for this plugin:

   ```yaml
   plugin:
     dev_environment:
       plugins:
         - name: Table
           disable_schema: false
           url: http://localhost:3005
           absolute_path: /absolute/path/to/plugin/repository/table
   ```
2. Start the backend: `./scripts/api_backend_dev.sh`
3. Start the frontend: `cd ui; npm run start`
