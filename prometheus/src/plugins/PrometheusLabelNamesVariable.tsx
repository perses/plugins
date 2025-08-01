import { VariablePlugin, GetVariableOptionsContext, replaceVariables, parseVariables } from '@perses-dev/plugin-system';
import { PrometheusClient, DEFAULT_PROM, getPrometheusTimeRange } from '../model';
import { stringArrayToVariableOptions, PrometheusLabelNamesVariableEditor } from './prometheus-variables';
import { PrometheusLabelNamesVariableOptions } from './types';

export const PrometheusLabelNamesVariable: VariablePlugin<PrometheusLabelNamesVariableOptions> = {
  getVariableOptions: async (spec: PrometheusLabelNamesVariableOptions, ctx: GetVariableOptionsContext) => {
    const client: PrometheusClient = await ctx.datasourceStore.getDatasourceClient(spec.datasource ?? DEFAULT_PROM);
    const match = spec.matchers ? spec.matchers.map((m) => replaceVariables(m, ctx.variables)) : undefined;
    const timeRange = getPrometheusTimeRange(ctx.timeRange);

    const { data: options } = await client.labelNames({ 'match[]': match, ...timeRange });
    return {
      data: stringArrayToVariableOptions(options),
    };
  },
  dependsOn: (spec: PrometheusLabelNamesVariableOptions) => {
    return { variables: spec.matchers?.map((m) => parseVariables(m)).flat() || [] };
  },
  OptionsEditorComponent: PrometheusLabelNamesVariableEditor,
  createInitialOptions: () => ({}),
};
