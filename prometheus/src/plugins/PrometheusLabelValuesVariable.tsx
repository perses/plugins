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
  DatasourceStore,
} from '@perses-dev/plugin-system';
import { DatasourceSelector, DatasourceSpec } from '@perses-dev/spec';
import { parseVariablesAndFormat, InterpolationFormat } from '@perses-dev/components';
import { DEFAULT_PROM, getPrometheusTimeRange, PROM_DATASOURCE_KIND } from '../model';
import { stringArrayToVariableOptions, PrometheusLabelValuesVariableEditor } from './prometheus-variables';
import { resolvePrometheusDatasource } from './interpolation';
import { PrometheusLabelValuesVariableOptions, PrometheusDatasourceSpec } from './types';

interface ExtendedDatasourceStore extends DatasourceStore {
  getDatasourceSpecSync?: (selector: DatasourceSelector) => DatasourceSpec | undefined;
}

function extractQueryParamVariables(datasourceSpec: DatasourceSpec<PrometheusDatasourceSpec>): string[] {
  try {
    const queryParams = datasourceSpec.plugin.spec.queryParams;

    if (!queryParams) return [];

    const variables: string[] = [];
    Object.values(queryParams).forEach((value) => {
      if (typeof value === 'string') {
        const variablesMap = parseVariablesAndFormat(value);
        variablesMap.forEach((format, varName) => {
          if (format === InterpolationFormat.QUERYPARAM) {
            variables.push(varName);
          }
        });
      }
    });

    return variables;
  } catch {
    return [];
  }
}

function getQueryParamVariablesFromCache(
  datasourceSelector: DatasourceSelector,
  datasourceStore: DatasourceStore
): string[] {
  try {
    const extendedStore = datasourceStore as ExtendedDatasourceStore;
    if (!extendedStore.getDatasourceSpecSync) return [];

    const datasourceSpec = extendedStore.getDatasourceSpecSync(datasourceSelector) as
      | DatasourceSpec<PrometheusDatasourceSpec>
      | undefined;
    return datasourceSpec ? extractQueryParamVariables(datasourceSpec) : [];
  } catch {
    return [];
  }
}

export const PrometheusLabelValuesVariable: VariablePlugin<PrometheusLabelValuesVariableOptions> = {
  getVariableOptions: async (spec: PrometheusLabelValuesVariableOptions, ctx: GetVariableOptionsContext) => {
    const pluginDef = spec;
    const datasourceSelector =
      datasourceSelectValueToSelector(
        spec.datasource ?? DEFAULT_PROM,
        ctx.variables,
        await ctx.datasourceStore.listDatasourceSelectItems(PROM_DATASOURCE_KIND)
      ) ?? DEFAULT_PROM;

    const { client, requestOptions } = await resolvePrometheusDatasource(
      ctx.datasourceStore,
      datasourceSelector,
      ctx.variables
    );
    const match = pluginDef.matchers ? pluginDef.matchers.map((m) => replaceVariables(m, ctx.variables)) : undefined;

    const timeRange = getPrometheusTimeRange(ctx.timeRange);

    const { data: options } = await client.labelValues(
      {
        labelName: replaceVariables(pluginDef.labelName, ctx.variables),
        'match[]': match,
        ...timeRange,
      },
      requestOptions
    );
    return {
      data: stringArrayToVariableOptions(options),
    };
  },
  dependsOn: (spec: PrometheusLabelValuesVariableOptions, ctx?: GetVariableOptionsContext) => {
    const matcherVariables = spec.matchers?.map((m) => parseVariables(m)).flat() || [];
    const labelVariables = parseVariables(spec.labelName);
    const datasourceVariables =
      spec.datasource && isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource) : [];

    let queryParamVariables: string[] = [];
    if (ctx?.datasourceStore && ctx?.variables) {
      const datasourceValue = spec.datasource ?? DEFAULT_PROM;
      const datasourceSelector: DatasourceSelector =
        typeof datasourceValue === 'string' ? { kind: PROM_DATASOURCE_KIND, name: datasourceValue } : datasourceValue;
      queryParamVariables = getQueryParamVariablesFromCache(datasourceSelector, ctx.datasourceStore);
    }

    const allDependencies = [...matcherVariables, ...labelVariables, ...datasourceVariables, ...queryParamVariables];
    const uniqueDependencies = Array.from(new Set(allDependencies));

    return {
      variables: uniqueDependencies,
    };
  },
  OptionsEditorComponent: PrometheusLabelValuesVariableEditor,
  createInitialOptions: () => ({ labelName: '' }),
};
