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
import { VictoriaLogsClient, DEFAULT_VICTORIALOGS, VICTORIALOGS_DATASOURCE_KIND } from '../../model';
import { VictoriaLogsFieldValuesVariableOptions } from '../types';
import { fieldItemsToVariableOptions, getVictoriaLogsTimeRange } from '../utils';
import { VictoriaLogsFieldValuesVariableEditor } from './VictoriaLogsFieldValuesVariableEditor';

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

    const { values } = query
      ? await client.fieldValues({
          field: replaceVariables(spec.field, ctx.variables),
          query: query,
          ...timeRange,
        })
      : { values: [] };
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
