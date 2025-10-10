import { VariablePlugin, GetVariableOptionsContext, replaceVariables, parseVariables } from '@perses-dev/plugin-system';
import { VictoriaLogsClient, DEFAULT_VICTORIALOGS } from '../../model';
import { VictoriaLogsFieldNamesVariableEditor } from './VictoriaLogsFieldNamesVariableEditor';
import { fieldItemsToVariableOptions, getVictoriaLogsTimeRange } from '../utils';
import { VictoriaLogsFieldNamesVariableOptions } from '../types';

export const VictoriaLogsFieldNamesVariable: VariablePlugin<VictoriaLogsFieldNamesVariableOptions> = {
  getVariableOptions: async (spec: VictoriaLogsFieldNamesVariableOptions, ctx: GetVariableOptionsContext) => {
    const client: VictoriaLogsClient = await ctx.datasourceStore.getDatasourceClient(spec.datasource ?? DEFAULT_VICTORIALOGS);
    const timeRange = getVictoriaLogsTimeRange(ctx.timeRange);
    const query = replaceVariables(spec.query, ctx.variables);

    const { values } = query ? await client.fieldNames({ query: query, ...timeRange }) : { values: [] };
    return {
      data: fieldItemsToVariableOptions(values),
    };
  },
  dependsOn: (spec: VictoriaLogsFieldNamesVariableOptions) => {
    return { variables: parseVariables(spec.query) || [] };
  },
  OptionsEditorComponent: VictoriaLogsFieldNamesVariableEditor,
  createInitialOptions: () => ({ query: '' }),
};
