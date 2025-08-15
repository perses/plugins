import { TimeSeriesQueryPlugin, parseVariables } from '@perses-dev/plugin-system';
import { getTimeSeriesData } from './get-click-house-data';
import { ClickHouseTimeSeriesQueryEditor } from './ClickHouseQueryEditor';
import { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';

export const ClickHouseTimeSeriesQuery: TimeSeriesQueryPlugin<ClickHouseTimeSeriesQuerySpec> = {
  getTimeSeriesData,
  OptionsEditorComponent: ClickHouseTimeSeriesQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
};
