import { TimeSeriesData, ThresholdOptions } from "@perses-dev/core";
import { PanelProps, LegendSpecOptions } from '@perses-dev/plugin-system';

export interface LogsTableMetadata {
  executedQueryString?: string;
  rows?: Array<Record<string, string | number>>;
}

export interface LogsTableQueryData extends Omit<TimeSeriesData, 'metadata'> {
  metadata: LogsTableMetadata;
}

export type QueryData = LogsTableQueryData;

export type LogsTablePanelProps = PanelProps<LogsTablePanelOptions, QueryData>;

export interface QuerySettingsOptions {
  queryIndex: number;
  colorMode: 'fixed' | 'fixed-single';
  colorValue: string;
}

export interface LogsTablePanelOptions {
  legend?: LegendSpecOptions;
  thresholds?: ThresholdOptions;
  querySettings?: QuerySettingsOptions;
}

