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

import { ModuleFederationOptions } from '@module-federation/rsbuild-plugin';
import * as packageLockJson from './package-lock.json';

// keep this list in sync with https://github.com/perses/perses/blob/main/ui/plugin-system/src/remote/PluginRuntime.tsx
export const sharedModules: ModuleFederationOptions["shared"] = {
  'react': { singleton: true },
  'react-dom': { singleton: true },
  'react-router-dom': { singleton: true },
  '@tanstack/react-query': { singleton: true },
  'react-hook-form': { singleton: true },
  'echarts': { singleton: true },
  '@perses-dev/core': { singleton: true },
  '@perses-dev/components': { singleton: true },
  '@perses-dev/plugin-system': { singleton: true },
  '@perses-dev/explore': { singleton: true },
  '@perses-dev/dashboards': { singleton: true },
  'date-fns': { singleton: true },
  'date-fns-tz': { version: packageLockJson.packages["node_modules/date-fns-tz"].version, singleton: true },
  'lodash': { singleton: true },
  '@emotion/react': {  singleton: true },
  '@emotion/styled': { singleton: true },
  '@hookform/resolvers': { singleton: true },
  'use-resize-observer': { singleton: true },
  'mdi-material-ui': {  singleton: true },
  'immer': {  singleton: true },
};
