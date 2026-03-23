// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  VariablePlugin,
  GetVariableOptionsContext,
  replaceVariables,
  parseVariables,
  datasourceSelectValueToSelector,
  isVariableDatasource,
} from '@perses-dev/plugin-system';
import { PrometheusClient, DEFAULT_PROM, PROM_DATASOURCE_KIND } from '../model';
import {
  capturingMatrix,
  capturingVector,
  stringArrayToVariableOptions,
  PrometheusPromQLVariableEditor,
} from './prometheus-variables';
import { PrometheusPromQLVariableOptions } from './types';

export const PrometheusPromQLVariable: VariablePlugin<PrometheusPromQLVariableOptions> = {
  getVariableOptions: async (spec: PrometheusPromQLVariableOptions, ctx: GetVariableOptionsContext) => {
    const datasourceSelector =
      datasourceSelectValueToSelector(
        spec.datasource ?? DEFAULT_PROM,
        ctx.variables,
        await ctx.datasourceStore.listDatasourceSelectItems(PROM_DATASOURCE_KIND)
      ) ?? DEFAULT_PROM;
    const client: PrometheusClient = await ctx.datasourceStore.getDatasourceClient(datasourceSelector);
    // TODO we may want to manage a range query as well.
    const { data: options } = await client.instantQuery({
      query: replaceVariables(spec.expr, ctx.variables),
    });
    const labelName = replaceVariables(spec.labelName, ctx.variables);
    let values: string[] = [];
    if (options?.resultType === 'matrix') {
      values = capturingMatrix(options, labelName);
    } else if (options?.resultType === 'vector') {
      values = capturingVector(options, labelName);
    }

    return {
      data: stringArrayToVariableOptions(values),
    };
  },
  dependsOn: (spec: PrometheusPromQLVariableOptions) => {
    const exprVariables = parseVariables(spec.expr);
    const labelVariables = parseVariables(spec.labelName);
    const datasourceVariables =
      spec.datasource && isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource) : [];
    return { variables: [...exprVariables, ...labelVariables, ...datasourceVariables] };
  },
  OptionsEditorComponent: PrometheusPromQLVariableEditor,
  createInitialOptions: () => ({ expr: '', labelName: '' }),
};
