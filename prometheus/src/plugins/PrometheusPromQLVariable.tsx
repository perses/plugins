import { VariablePlugin, GetVariableOptionsContext, replaceVariables, parseVariables } from '@perses-dev/plugin-system';
import { PrometheusClient, DEFAULT_PROM } from '../model';
import {
  capturingMatrix,
  capturingVector,
  stringArrayToVariableOptions,
  PrometheusPromQLVariableEditor,
} from './prometheus-variables';
import { PrometheusPromQLVariableOptions } from './types';

export const PrometheusPromQLVariable: VariablePlugin<PrometheusPromQLVariableOptions> = {
  getVariableOptions: async (spec: PrometheusPromQLVariableOptions, ctx: GetVariableOptionsContext) => {
    const client: PrometheusClient = await ctx.datasourceStore.getDatasourceClient(spec.datasource ?? DEFAULT_PROM);
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
    return { variables: parseVariables(spec.expr).concat(parseVariables(spec.labelName)) };
  },
  OptionsEditorComponent: PrometheusPromQLVariableEditor,
  createInitialOptions: () => ({ expr: '', labelName: '' }),
};
