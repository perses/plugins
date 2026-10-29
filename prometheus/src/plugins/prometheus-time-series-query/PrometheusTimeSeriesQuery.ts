// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import { isVariableDatasource, parseVariables } from '@perses-dev/plugin-system';

import { getTimeSeriesData } from './get-time-series-data';
import { PrometheusTimeSeriesQueryEditor } from './PrometheusTimeSeriesQueryEditor';
import type { PrometheusTimeSeriesQuerySpec } from './time-series-query-model';

/**
 * The core Prometheus TimeSeriesQuery plugin for Perses.
 */
export const PrometheusTimeSeriesQuery: TimeSeriesQueryPlugin<PrometheusTimeSeriesQuerySpec> = {
  getTimeSeriesData,
  OptionsEditorComponent: PrometheusTimeSeriesQueryEditor,
  createInitialOptions: () => ({
    query: '',
    datasource: undefined,
  }),
  dependsOn: (spec) => {
    // Variables can be used in the query, the legend format string, the Min Step and the datasource
    const queryVariables = parseVariables(spec.query);
    const legendVariables = parseVariables(spec.seriesNameFormat || '');
    const minStepVariables = parseVariables(spec.minStep || '');
    const datasourceVariable = isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource ?? '') : [];
    const allVariables = [
      ...new Set([...queryVariables, ...legendVariables, ...minStepVariables, ...datasourceVariable]),
    ];
    return {
      variables: allVariables,
    };
  },
};
