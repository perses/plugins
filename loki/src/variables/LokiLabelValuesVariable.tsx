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
import { LokiClient, DEFAULT_LOKI, getLokiTimeRange, LOKI_DATASOURCE_KIND } from '../model';
import { stringArrayToVariableOptions, LokiLabelValuesVariableEditor } from './loki-variables';
import { LokiLabelValuesVariableOptions } from './types';

export const LokiLabelValuesVariable: VariablePlugin<LokiLabelValuesVariableOptions> = {
  getVariableOptions: async (spec, ctx) => {
    const datasourceSelector =
      datasourceSelectValueToSelector(
        spec.datasource ?? DEFAULT_LOKI,
        ctx.variables,
        await ctx.datasourceStore.listDatasourceSelectItems(LOKI_DATASOURCE_KIND)
      ) ?? DEFAULT_LOKI;
    const client: LokiClient = await ctx.datasourceStore.getDatasourceClient(datasourceSelector);
    const query = spec.matchers ? replaceVariables(spec.matchers[0] ?? '', ctx.variables) || undefined : undefined;
    const timeRange = getLokiTimeRange(ctx.timeRange);
    const { data: options } = await client.labelValues({
      labelName: replaceVariables(spec.labelName, ctx.variables),
      start: timeRange.start,
      end: timeRange.end,
      query,
    });
    return { data: stringArrayToVariableOptions(options) };
  },
  dependsOn: (spec) => {
    const matcherVariables = spec.matchers?.map((m) => parseVariables(m)).flat() || [];
    const labelVariables = parseVariables(spec.labelName);
    const datasourceVariables =
      spec.datasource && isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource) : [];
    return { variables: [...matcherVariables, ...labelVariables, ...datasourceVariables] };
  },
  OptionsEditorComponent: LokiLabelValuesVariableEditor,
  createInitialOptions: () => ({ labelName: '' }),
};
