import { VariablePlugin, GetVariableOptionsContext, replaceVariables, parseVariables } from '@perses-dev/plugin-system';
import { PrometheusClient, DEFAULT_PROM, getPrometheusTimeRange } from '../model';
import { stringArrayToVariableOptions, PrometheusLabelValuesVariableEditor } from './prometheus-variables';
import { PrometheusLabelValuesVariableOptions } from './types';

export const PrometheusLabelValuesVariable: VariablePlugin<PrometheusLabelValuesVariableOptions> = {
  getVariableOptions: async (spec: PrometheusLabelValuesVariableOptions, ctx: GetVariableOptionsContext) => {
    const pluginDef = spec;
    const client: PrometheusClient = await ctx.datasourceStore.getDatasourceClient(spec.datasource ?? DEFAULT_PROM);
    const match = pluginDef.matchers ? pluginDef.matchers.map((m) => replaceVariables(m, ctx.variables)) : undefined;

    const timeRange = getPrometheusTimeRange(ctx.timeRange);

    const { data: options } = await client.labelValues({
      labelName: replaceVariables(pluginDef.labelName, ctx.variables),
      'match[]': match,
      ...timeRange,
    });
    return {
      data: stringArrayToVariableOptions(options),
    };
  },
  dependsOn: (spec: PrometheusLabelValuesVariableOptions) => {
    return {
      variables:
        spec.matchers
          ?.map((m) => parseVariables(m))
          .flat()
          .concat(parseVariables(spec.labelName)) || [],
    };
  },
  OptionsEditorComponent: PrometheusLabelValuesVariableEditor,
  createInitialOptions: () => ({ labelName: '' }),
};
