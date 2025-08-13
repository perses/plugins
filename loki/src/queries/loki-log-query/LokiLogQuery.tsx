import { parseVariables } from '@perses-dev/plugin-system';
import { getLokiLogData } from './get-loki-log-data';
import { LokiLogQueryEditor } from './LokiLogQueryEditor';
import { LokiLogQuerySpec } from './loki-log-query-types';
import { LogQueryPlugin } from './log-query-plugin-interface';

export const LokiLogQuery: LogQueryPlugin<LokiLogQuerySpec> = {
  getLogData: getLokiLogData,
  OptionsEditorComponent: LokiLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
};
