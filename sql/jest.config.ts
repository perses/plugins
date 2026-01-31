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

import type { Config } from '@jest/types';
import shared from '../jest.shared';

// Cast shared to the exact Jest config type to avoid type incompatibilities coming from differing @jest/types
const sharedConfig = shared as unknown as Config.InitialOptions;

const jestConfig: Config.InitialOptions = {
  ...sharedConfig,

  setupFilesAfterEnv: [...(sharedConfig.setupFilesAfterEnv ?? []), '<rootDir>/src/setup-tests.ts'],
};

export default jestConfig;
