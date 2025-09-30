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

const assetPrefix = '/plugins/HistogramChart/';

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
      name: 'HistogramChart',
      exposes: {
        './HistogramChart': './src/HistogramChart.ts',
      },
      shared: {
        react: { requiredVersion: '18.2.0', singleton: true },
        'react-dom': { requiredVersion: '18.2.0', singleton: true },
        echarts: { singleton: true },
        lodash: { singleton: true },
        '@perses-dev/core': { singleton: true },
        '@perses-dev/components': { singleton: true },
        '@perses-dev/plugin-system': { singleton: true },
        immer: { singleton: true },
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
