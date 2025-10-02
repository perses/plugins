import { parseVariables } from '@perses-dev/plugin-system';
import { getVictoriaLogsLogData } from './query';
import { VictoriaLogsLogQueryEditor } from './VictoriaLogsLogQueryEditor';
import { VictoriaLogsLogQuerySpec } from './types';
import { LogQueryPlugin } from './interface';

export const VictoriaLogsLogQuery: LogQueryPlugin<VictoriaLogsLogQuerySpec> = {
  getLogData: getVictoriaLogsLogData,
  OptionsEditorComponent: VictoriaLogsLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
};
