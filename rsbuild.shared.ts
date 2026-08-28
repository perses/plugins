// Copyright The Perses Authors
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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
export function createConfigForPlugin(options: PluginConfigOptions): RsbuildConfig {
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
    rsbuildConfigWithMfPlugin, // then add the Module Federation plugin last
  );
}

function getAssetPrefix(name: string, version?: string): string {
  // The Perses server serves plugin files from `/plugins/<name>[~<version>[~<registry>]]/`. Including the version makes
  // each version's assets resolve from its own directory: without it, every request lands on `/plugins/<name>/`, which
  // the server resolves to the *latest* installed version, so any non-latest (e.g. pinned/locked) version tries to load
  // the latest version's files and fails.
  const identity = version ? `${name}~${version}` : name;
  return `${PLUGINS_PATH}/${identity}/`;
}

/**
 * Reads the plugin version from the `package.json` of the plugin currently being built. Returns `undefined` when it
 * cannot be determined, in which case asset paths fall back to the version-less prefix.
 */
function getPluginVersion(): string | undefined {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
    return typeof pkg.version === 'string' && pkg.version.length > 0 ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

function getRsbuildConfig(name: string): RsbuildConfig {
  const assetPrefix = getAssetPrefix(name);
  const version = process.env.NODE_ENV === 'development' ? undefined : getPluginVersion();

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
      assetPrefix,
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
        if (process.env.NODE_ENV !== 'development') {
          config.output.publicPath = 'auto';
        }
        // Isolate each version's webpack runtime.
        //
        // `chunk_<uniqueName>` is the global array async chunks register into. When two versions of the same plugin
        // share it, the version loaded second pushes its chunks into the first one's runtime, and because module IDs are
        // deterministic they collide, so both versions end up resolving to the first one's modules (two different
        // versions rendering identically). `chunkLoadingGlobal` is derived before this hook runs, so it has to be set
        // explicitly rather than relying on `uniqueName`.
        if (version) {
          const uniqueName = toGlobalName(name, version);
          config.output.uniqueName = uniqueName;
          config.output.chunkLoadingGlobal = `chunk_${uniqueName}`;
        }
        return config;
      },
    },
  };
}

function getBaseModuleFederationConfig(name: string): ModuleFederationOptions {
  const config: ModuleFederationOptions = {
    name,
    dts: false,
    runtime: false,
  };

  // In development the plugin is served by the rsbuild dev server and proxied by Perses, which strips the whole
  // `/plugins/<segment>` prefix, so the version-less prefix is what works there.
  //
  // For production builds the prefix embeds the plugin version (`/plugins/<name>~<version>/`) so that each installed
  // version loads its own assets. Without it every request goes to `/plugins/<name>/`, which the server resolves to the
  // latest installed version, so a pinned/older version ends up requesting the latest version's hashed files (404).
  const version = process.env.NODE_ENV === 'development' ? undefined : getPluginVersion();
  config.getPublicPath = `function() { const prefix = window.PERSES_PLUGIN_ASSETS_PATH || window.PERSES_APP_CONFIG?.api_prefix || ""; return prefix + "${getAssetPrefix(name, version)}"; }`;

  // Give each version its own global container name.
  //
  // The Module Federation runtime resolves a remote's container through `globalThis[globalName]`, where `globalName`
  // comes from this library name via the manifest (see `assignRemoteInfo` in `@module-federation/runtime-core`). It also
  // early-returns an already-registered container: `if (remoteEntryExports) return remoteEntryExports`. So when several
  // versions of the same plugin share the global name, the first version loaded wins and every other version silently
  // reuses its container instead of loading its own entry, which makes two different versions render identically.
  if (version) {
    config.library = { type: 'global', name: toGlobalName(name, version) };
  }

  return config;
}

/** Build a JS-identifier-safe global container name that is unique per plugin version. */
function toGlobalName(name: string, version: string): string {
  return `${name}_${version}`.replace(/[^a-zA-Z0-9_$]/g, '_');
}
