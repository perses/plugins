import { TimeSeriesData, ThresholdOptions } from "@perses-dev/core";
import { PanelProps, LegendSpecOptions } from '@perses-dev/plugin-system';
import { ClickHouseTimeSeriesData } from "../../model/click-house-data-types";

export type QueryData = ClickHouseTimeSeriesData; // Type of data returned by a query plugin and supported by this plugin

export type LogsProps = PanelProps<LogsOptions, QueryData>;

export interface QuerySettingsOptions {
  queryIndex: number;
  colorMode: 'fixed' | 'fixed-single';
  colorValue: string;
}

export interface LogsOptions {
  legend?: LegendSpecOptions;
  thresholds?: ThresholdOptions;
  querySettings?: QuerySettingsOptions;
}