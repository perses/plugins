import { VariablePlugin, GetVariableOptionsContext, replaceVariables, parseVariables } from '@perses-dev/plugin-system';
import { VictoriaLogsClient, DEFAULT_VICTORIALOGS } from '../../model';
import { VictoriaLogsFieldValuesVariableEditor } from './VictoriaLogsFieldValuesVariableEditor';
import { VictoriaLogsFieldValuesVariableOptions } from '../types';
import { fieldItemsToVariableOptions, getVictoriaLogsTimeRange } from '../utils';

export const VictoriaLogsFieldValuesVariable: VariablePlugin<VictoriaLogsFieldValuesVariableOptions> = {
  getVariableOptions: async (spec: VictoriaLogsFieldValuesVariableOptions, ctx: GetVariableOptionsContext) => {
    const client: VictoriaLogsClient = await ctx.datasourceStore.getDatasourceClient(spec.datasource ?? DEFAULT_VICTORIALOGS);
    const query = replaceVariables(spec.query, ctx.variables);

    const timeRange = getVictoriaLogsTimeRange(ctx.timeRange);

    const { values } = query ? await client.fieldValues({
      field: replaceVariables(spec.field, ctx.variables),
      query: query,
      ...timeRange,
    }) : { values: [] };
    return {
      data: fieldItemsToVariableOptions(values),
    };
  },
  dependsOn: (spec: VictoriaLogsFieldValuesVariableOptions) => {
    return {
      variables: parseVariables(spec.query).concat(parseVariables(spec.field)) || [],
    };
  },
  OptionsEditorComponent: VictoriaLogsFieldValuesVariableEditor,
  createInitialOptions: () => ({ field: '', query: '' }),
};
