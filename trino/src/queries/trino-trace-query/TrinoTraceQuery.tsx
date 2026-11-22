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

import { queryVariables } from '../query-context';
import { getTrinoTraceData } from './get-trino-trace-data';
import type { TrinoTraceQuerySpec } from './trino-trace-query-types';
import { TrinoTraceQueryEditor } from './TrinoTraceQueryEditor';

/** TrinoTraceQuery is the trace query plugin that reads spans from a Trino SQL result. */
export const TrinoTraceQuery: TraceQueryPlugin<TrinoTraceQuerySpec> = {
  getTraceData: getTrinoTraceData,
  OptionsEditorComponent: TrinoTraceQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => ({ variables: queryVariables(spec) }),
};
