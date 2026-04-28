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

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Config } from '@jest/types';

const here = dirname(fileURLToPath(import.meta.url));
const swcrc = JSON.parse(readFileSync(resolve(here, '../.cjs.swcrc'), 'utf-8'));

const jestConfig: Config.InitialOptions = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^echarts/(.*)$': 'echarts',
    '^use-resize-observer$': 'use-resize-observer/polyfilled',
    '\\.(css|less)$': '<rootDir>/../stylesMock.js',
    '^react$': '<rootDir>/../node_modules/react',
    '^react-dom$': '<rootDir>/../node_modules/react-dom',
    '^react/jsx-runtime$': '<rootDir>/../node_modules/react/jsx-runtime',
    '^react-dom/(.*)$': '<rootDir>/../node_modules/react-dom/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(lodash-es|yaml))'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['@swc/jest', { ...swcrc, exclude: [], swcrc: false }],
  },
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.ts'],
};

export default jestConfig;
