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

import { pluginReact } from '@rsbuild/plugin-react';

import { createConfigForPlugin } from '../rsbuild.shared';

export default createConfigForPlugin({
  name: 'Json',
  rsbuildConfig: {
    plugins: [pluginReact()],
  },
  moduleFederation: {
    exposes: {
      './JsonDatasource': './src/datasources/json-datasource',
      './JsonQuery': './src/queries/json-query',
    },
    shared: {
      react: { requiredVersion: '18.2.0', singleton: true },
      'react-dom': { requiredVersion: '18.2.0', singleton: true },
      '@emotion/react': { requiredVersion: '^11.11.3', singleton: true },
      '@emotion/styled': { singleton: true },
      '@perses-dev/plugin-system': { singleton: true },
      '@perses-dev/client': { singleton: true },
      immer: { singleton: true },
      'react-hook-form': { singleton: true },
    },
  },
});
