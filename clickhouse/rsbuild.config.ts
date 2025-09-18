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

import { ModuleFederationOptions, pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export const assetPrefix = '/plugins/ClickHouse/';

// Expose the components that will be used in the UI, either Perses UI or embedded.
const exposedModules: ModuleFederationOptions['exposes'] = [
  { './ClickHouseDatasource': './src/datasources/click-house-datasource' },
  { './ClickHouseTimeSeriesQuery': './src/queries/click-house-time-series-query' },
  { './ClickHouseLogQuery': './src/queries/click-house-log-query' },
  { './Logs': './src/panels/logs' },
];

export default defineConfig({
  server: { port: 3119 },
  dev: { assetPrefix },
  source: { entry: { main: './src/index-federation.ts' } },
  output: {
    assetPrefix,
    copy: [{ from: 'package.json' }, { from: 'README.md' }],
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
      name: 'ClickHouse',
      exposes: exposedModules,
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
    }),
  ],
  tools: {
    htmlPlugin: false,
  },
});
