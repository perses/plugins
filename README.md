# Perses Plugins

This repository contains the core plugins for [Perses](https://github.com/perses/perses)

## Development

As prerequisites, you need:

- NodeJS [version 22 or greater](https://nodejs.org/).
- npm [version 10 or greater](https://www.npmjs.com/).

You should first run `npm install` at the root of the repository.

Then in [`perses`](https://github.com/perses/perses) repository:

1. Update the Perses configuration `config.yaml` to use development server for this plugin:

   ```yaml
   plugin:
     enable_dev: true
   ```

2. Start the backend: `./scripts/api_backend_dev.sh`
3. Login percli to the backend `percli login http://localhost:8080`
4. Start the plugin development server: `percli plugin start /path/to/the/plugin/dir`
