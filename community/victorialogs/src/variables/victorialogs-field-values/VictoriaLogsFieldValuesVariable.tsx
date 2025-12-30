import {
  VariablePlugin,
  GetVariableOptionsContext,
  replaceVariables,
  parseVariables,
  datasourceSelectValueToSelector,
  isVariableDatasource,
} from '@perses-dev/plugin-system';
import { VictoriaLogsClient, DEFAULT_VICTORIALOGS, VICTORIALOGS_DATASOURCE_KIND } from '../../model';
import { VictoriaLogsFieldValuesVariableEditor } from './VictoriaLogsFieldValuesVariableEditor';
import { VictoriaLogsFieldValuesVariableOptions } from '../types';
import { fieldItemsToVariableOptions, getVictoriaLogsTimeRange } from '../utils';

export const VictoriaLogsFieldValuesVariable: VariablePlugin<VictoriaLogsFieldValuesVariableOptions> = {
  getVariableOptions: async (spec: VictoriaLogsFieldValuesVariableOptions, ctx: GetVariableOptionsContext) => {
    const datasourceSelector =
      datasourceSelectValueToSelector(
        spec.datasource ?? DEFAULT_VICTORIALOGS,
        ctx.variables,
        await ctx.datasourceStore.listDatasourceSelectItems(VICTORIALOGS_DATASOURCE_KIND)
      ) ?? DEFAULT_VICTORIALOGS;
    const client: VictoriaLogsClient = await ctx.datasourceStore.getDatasourceClient(datasourceSelector);
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
    const queryVariables = parseVariables(spec.query);
    const labelVariables = parseVariables(spec.field);
    const datasourceVariables =
      spec.datasource && isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource) : [];
    return {
      variables: [...queryVariables, ...labelVariables, ...datasourceVariables],
    };
  },
  OptionsEditorComponent: VictoriaLogsFieldValuesVariableEditor,
  createInitialOptions: () => ({ field: '', query: '' }),
};
