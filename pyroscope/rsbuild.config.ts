// Copyright 2025 The Perses Authors
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

import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const assetPrefix = '/plugins/Pyroscope/';

export default defineConfig({
  server: { port: 3020 },
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
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'Pyroscope',
      exposes: {
        './PyroscopeDatasource': './src/plugins/pyroscope-datasource.tsx',
        './PyroscopeProfileQuery': './src/plugins/pyroscope-profile-query/PyroscopeProfileQuery.ts',
        './PyroscopeExplorer': './src/explore/PyroscopeExplorer.tsx',
      },
      shared: {
        react: { requiredVersion: '18.2.0', singleton: true },
        'react-dom': { requiredVersion: '18.2.0', singleton: true },
        echarts: { singleton: true },
        'date-fns': { singleton: true },
        'date-fns-tz': { singleton: true },
        lodash: { singleton: true },
        '@perses-dev/components': { singleton: true },
        '@perses-dev/plugin-system': { singleton: true },
        '@perses-dev/explore': { singleton: true },
        '@perses-dev/dashboards': { singleton: true },
        '@emotion/react': { requiredVersion: '^11.11.3', singleton: true },
        '@emotion/styled': { singleton: true },
        '@hookform/resolvers': { singleton: true },
        '@tanstack/react-query': { singleton: true },
        'react-hook-form': { singleton: true },
        'react-router-dom': { singleton: true },
      },
      dts: false,
      runtime: false,
      getPublicPath: `function() { const prefix = window.PERSES_PLUGIN_ASSETS_PATH || window.PERSES_APP_CONFIG?.api_prefix || ""; return prefix + "${assetPrefix}"; }`,
    }),
  ],
  tools: {
    htmlPlugin: false,
  },
});
