import { AbsoluteTimeRange, UnknownSpec } from '@perses-dev/core';
import { DatasourceStore, Plugin, VariableStateMap } from '@perses-dev/plugin-system';
import { LogData } from '@perses-dev/core';

export interface LogQueryResult {
  logs: LogData;
  timeRange: AbsoluteTimeRange;
  metadata?: {
    executedQueryString: string;
  };
}

export interface ClickHouseQueryContext {
  timeRange: AbsoluteTimeRange;
  variableState: VariableStateMap;
  datasourceStore: DatasourceStore;
  refreshKey: string;
}

type LogQueryPluginDependencies = {
  variables?: string[];
};

export interface LogQueryPlugin<Spec = UnknownSpec> extends Plugin<Spec> {
  getLogData: (spec: Spec, ctx: ClickHouseQueryContext) => Promise<LogQueryResult>;
  dependsOn?: (spec: Spec, ctx: ClickHouseQueryContext) => LogQueryPluginDependencies;
}
