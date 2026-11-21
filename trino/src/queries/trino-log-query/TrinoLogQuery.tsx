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

import type { LogQueryPlugin } from '@perses-dev/plugin-system';

import { queryVariables } from '../query-context';
import { getTrinoLogData } from './get-trino-log-data';
import type { TrinoLogQuerySpec } from './trino-log-query-types';
import { TrinoLogQueryEditor } from './TrinoLogQueryEditor';

export const TrinoLogQuery: LogQueryPlugin<TrinoLogQuerySpec> = {
  getLogData: getTrinoLogData,
  OptionsEditorComponent: TrinoLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => ({ variables: queryVariables(spec) }),
  // TODO: Implement proper SQL parsing for volume queries
  createVolumeQuery: () => null,
};
