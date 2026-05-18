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

import {
  VariablePlugin,
  replaceVariables,
  parseVariables,
  datasourceSelectValueToSelector,
  isVariableDatasource,
} from '@perses-dev/plugin-system';
import { LokiClient, DEFAULT_LOKI, LOKI_DATASOURCE_KIND, getLokiTimeRange } from '../model';
import {
  capturingMetric,
  capturingStreams,
  stringArrayToVariableOptions,
  LokiLogQLVariableEditor,
} from './loki-variables';
import { LokiLogQLVariableOptions } from './types';

export const LokiLogQLVariable: VariablePlugin<LokiLogQLVariableOptions> = {
  getVariableOptions: async (spec, ctx) => {
    const datasourceSelector =
      datasourceSelectValueToSelector(
        spec.datasource ?? DEFAULT_LOKI,
        ctx.variables,
        await ctx.datasourceStore.listDatasourceSelectItems(LOKI_DATASOURCE_KIND)
      ) ?? DEFAULT_LOKI;
    const client: LokiClient = await ctx.datasourceStore.getDatasourceClient(datasourceSelector);
    const timeRange = getLokiTimeRange(ctx.timeRange);
    const response = await client.queryRange({
      query: replaceVariables(spec.expr, ctx.variables),
      start: timeRange.start,
      end: timeRange.end,
    });
    const labelName = replaceVariables(spec.labelName, ctx.variables);
    let values: string[] = [];
    if (response.data?.resultType === 'streams') {
      values = capturingStreams(response.data.result, labelName);
    } else if (response.data?.resultType === 'matrix') {
      values = capturingMetric(response.data.result, labelName);
    }
    return { data: stringArrayToVariableOptions(values) };
  },
  dependsOn: (spec) => {
    const exprVariables = parseVariables(spec.expr);
    const labelVariables = parseVariables(spec.labelName);
    const datasourceVariables =
      spec.datasource && isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource) : [];
    return { variables: [...exprVariables, ...labelVariables, ...datasourceVariables] };
  },
  OptionsEditorComponent: LokiLogQLVariableEditor,
  createInitialOptions: () => ({ expr: '', labelName: '' }),
};
