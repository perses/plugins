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

import type { ProfileQueryPlugin } from '@perses-dev/plugin-system';

import type { ClickHouseProfileQuerySpec } from './click-house-profile-query-types';
import { ClickHouseProfileQueryEditor } from './ClickHouseProfileQueryEditor';
import { getProfileData } from './get-click-house-profile-data';

export const ClickHouseProfileQuery: ProfileQueryPlugin<ClickHouseProfileQuerySpec> = {
  getProfileData,
  OptionsEditorComponent: ClickHouseProfileQueryEditor,
  createInitialOptions: () => ({ query: '' }),
};
