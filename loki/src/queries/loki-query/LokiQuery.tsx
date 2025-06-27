import { TimeSeriesQueryPlugin, parseVariables } from '@perses-dev/plugin-system';
import { getTimeSeriesData } from './get-time-series-data';
import { LokiQueryEditor } from './LokiQueryEditor';
import { LokiQuerySpec } from './loki-query-types';

export const LokiQuery: TimeSeriesQueryPlugin<LokiQuerySpec> = {
  getTimeSeriesData,
  OptionsEditorComponent: LokiQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
};
