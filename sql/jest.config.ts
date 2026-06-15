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

const path = require('path');
const fs = require('fs');

const swcrcPath = path.join(__dirname, '..', '.cjs.swcrc');
const swcrc = JSON.parse(fs.readFileSync(swcrcPath, 'utf-8'));

module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^echarts/(.*)$': 'echarts',
    '^use-resize-observer$': 'use-resize-observer/polyfilled',
    '\\.(css|less)$': '<rootDir>/../stylesMock.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(lodash-es|yaml|@perses-dev))'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['@swc/jest', { ...swcrc, exclude: [], swcrc: false }],
  },
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.ts'],
};
