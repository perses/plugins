// Copyright 2024 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ModuleFederationOptions, pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { mergeRsbuildConfig, RsbuildConfig } from '@rsbuild/core';

/** The base path for all plugin assets. This should match the path where plugins are stored on the Perses server.
 * @see {@link https://github.com/perses/perses}
 */
const PLUGINS_PATH = '/plugins';

/**
 * Configuration options for building a Perses plugin with rsbuild.
 * @see {@link createConfigForPlugin}
 */
interface PluginConfigOptions {
  /**
   * The name of the plugin. Typically PascalCase
   */
  name: string;
  /**
   * Any rsbuild configuration options to merge with the base config. Note that
   * the `server.port` and `output.assetPrefix` are automatically set based on
   * the plugin name but can be overridden here. Additionally, the
   * ModuleFederation plugin is automatically added after any plugins specified
   * here. It's options can be configured via the `moduleFederation` property.
   *
   * @see {@link getRsbuildConfig}
   */
  rsbuildConfig?: RsbuildConfig;
  /**
   * Module Federation configuration options to pass to the Module Federation
   * plugin. Note that the `name` is inherited from the `name` property defined
   * alongside this object. Any values defined here will be merged over the base
   * config.
   *
   * @see {@link getBaseModuleFederationConfig}
   */
  moduleFederation?: ModuleFederationOptions;
}

/**
 * Creates a complete rsbuild configuration for a Perses plugin, including sensible defaults for the dev server, output
 * asset prefix, and module federation plugin configuration.
 *
 * @param options Configuration options for the plugin build.
 * @returns A complete rsbuild configuration object.
 *
 * @example
 * ```ts
 * import { createConfigForPlugin } from './rsbuild.shared';
 * import type { RsbuildConfig } from '@rsbuild/core';
 * import type { ModuleFederationOptions } from '@module-federation/rsbuild-plugin';
 *
 * const config: RsbuildConfig = createConfigForPlugin({
 *   name: 'MyPlugin',
 *   rsbuildConfig: {
 *     // any additional rsbuild config options here
 *   },
 *   moduleFederation: {
 *     // any additional module federation options here
 *   },
 * });
 * ```
 */
export function createConfigForPlugin(options: PluginConfigOptions) {
  const { name, rsbuildConfig = {}, moduleFederation = {} } = options;

  const mfConfig: ModuleFederationOptions = {
    ...getBaseModuleFederationConfig(name), // base config first
    ...moduleFederation, // then any user config overrides
  };

  const baseConfig: RsbuildConfig = getRsbuildConfig(name);
  const rsbuildConfigWithMfPlugin: RsbuildConfig = { plugins: [pluginModuleFederation(mfConfig)] };

  return mergeRsbuildConfig(
    baseConfig, // base config first
    rsbuildConfig, // then any user config overrides
    rsbuildConfigWithMfPlugin // then add the Module Federation plugin last
  );
}

function getAssetPrefix(name: string): string {
  return `${PLUGINS_PATH}/${name}/`;
}

function getRsbuildConfig(name: string): RsbuildConfig {
  const assetPrefix = getAssetPrefix(name);

  return {
    server: {
      port: 3000 + Math.floor(Math.random() * 1000),
      strictPort: false,
      printUrls: process.env.PERSES_CLI
        ? ({ port, protocol }) => {
            // custom output for `percli plugin start` to detect port for dev server
            console.log(`[PERSES_PLUGIN] NAME="${name}" PORT="${port}" PROTOCOL="${protocol}"\n`);
            console.log(`Local: ${protocol}://localhost:${port}`);
            return [];
          }
        : true,
      cors: { origin: '*' },
    },
    dev: { assetPrefix },
    source: { entry: { main: './src/index-federation.ts' } },
    output: {
      copy: [{ from: 'package.json' }, { from: 'README.md' }, { from: '../LICENSE', to: './LICENSE', toType: 'file' }],
      distPath: {
        root: 'dist',
        js: '__mf/js',
        css: '__mf/css',
        font: '__mf/font',
      },
    },
    tools: {
      htmlPlugin: false,
      rspack: (config) => {
        config.output = config.output || {};
        // Set to 'auto' to allow runtime override via __webpack_public_path__
        config.output.publicPath = 'auto';
        return config;
      },
    },
  };
}

function getBaseModuleFederationConfig(name: string): ModuleFederationOptions {
  return {
    name,
    dts: false,
    runtime: false,
    getPublicPath: `function() { const prefix = window.PERSES_PLUGIN_ASSETS_PATH || window.PERSES_APP_CONFIG?.api_prefix || ""; return prefix + "${getAssetPrefix(name)}"; }`,
  };
}
