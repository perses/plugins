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

import type { TraceQueryPlugin } from '@perses-dev/plugin-system';

import { queryDependencies } from '../../model/execute-query';
import type { ClickHouseTraceQuerySpec } from './click-house-trace-query-types';
import { ClickHouseTraceQueryEditor } from './ClickHouseTraceQueryEditor';
import { getTraceData } from './get-click-house-trace-data';

export const ClickHouseTraceQuery: TraceQueryPlugin<ClickHouseTraceQuerySpec> = {
  getTraceData,
  OptionsEditorComponent: ClickHouseTraceQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => queryDependencies(spec.datasource, spec.query),
};
