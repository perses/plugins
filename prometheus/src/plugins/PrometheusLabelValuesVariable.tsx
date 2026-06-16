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
import { parseVariablesAndFormat } from '@perses-dev/components';
import { DEFAULT_PROM, getPrometheusTimeRange, PROM_DATASOURCE_KIND } from '../model';
import { stringArrayToVariableOptions, PrometheusLabelValuesVariableEditor } from './prometheus-variables';
import { resolvePrometheusDatasource } from './interpolation';
import { PrometheusLabelValuesVariableOptions, PrometheusDatasourceSpec } from './types';

interface ExtendedDatasourceStore extends DatasourceStore {
  getDatasourceSpecSync?: (selector: DatasourceSelector) => DatasourceSpec | undefined;
}

function extractDatasourceVariables(datasourceSpec: DatasourceSpec<PrometheusDatasourceSpec>): string[] {
  try {
    const variables: string[] = [];
    const spec = datasourceSpec.plugin.spec;

    // Helper function to extract variables from a string value
    const extractFromString = (value: string): void => {
      const variablesMap = parseVariablesAndFormat(value);
      variablesMap.forEach((format, varName) => {
        variables.push(varName);
      });
    };

    // Helper function to extract variables from string or array values
    const extractFromValue = (value: string | string[]): void => {
      if (typeof value === 'string') {
        extractFromString(value);
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') {
            extractFromString(item);
          }
        });
      }
    };

    // Extract variables from queryParams
    if (spec.queryParams) {
      Object.values(spec.queryParams).forEach(extractFromValue);
    }

    // Extract variables from directUrl
    if (spec.directUrl) {
      extractFromString(spec.directUrl);
    }

    // Extract variables from proxy configuration
    if (spec.proxy?.spec) {
      // Extract from proxy URL
      if (spec.proxy.spec.url) {
        extractFromString(spec.proxy.spec.url);
      }

      // Extract from proxy headers
      if (spec.proxy.spec.headers) {
        Object.values(spec.proxy.spec.headers).forEach((value) => {
          if (typeof value === 'string') {
            extractFromString(value);
          }
        });
      }
    }

    return Array.from(new Set(variables)); // Remove duplicates
  } catch {
    return [];
  }
}

function getDatasourceVariablesFromCache(
  datasourceSelector: DatasourceSelector,
  datasourceStore: DatasourceStore
): string[] {
  try {
    const extendedStore = datasourceStore as ExtendedDatasourceStore;
    if (!extendedStore.getDatasourceSpecSync) return [];

    const datasourceSpec = extendedStore.getDatasourceSpecSync(datasourceSelector) as
      | DatasourceSpec<PrometheusDatasourceSpec>
      | undefined;
    return datasourceSpec ? extractDatasourceVariables(datasourceSpec) : [];
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

    let datasourceVariablesFromCache: string[] = [];
    if (ctx?.datasourceStore && ctx?.variables) {
      const datasourceValue = spec.datasource ?? DEFAULT_PROM;
      const datasourceSelector: DatasourceSelector =
        typeof datasourceValue === 'string' ? { kind: PROM_DATASOURCE_KIND, name: datasourceValue } : datasourceValue;
      datasourceVariablesFromCache = getDatasourceVariablesFromCache(datasourceSelector, ctx.datasourceStore);
    }

    const allDependencies = [
      ...matcherVariables,
      ...labelVariables,
      ...datasourceVariables,
      ...datasourceVariablesFromCache,
    ];
    const uniqueDependencies = Array.from(new Set(allDependencies));

    return {
      variables: uniqueDependencies,
    };
  },
  OptionsEditorComponent: PrometheusLabelValuesVariableEditor,
  createInitialOptions: () => ({ labelName: '' }),
};
