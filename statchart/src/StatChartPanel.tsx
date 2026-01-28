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

import { TitleComponentOption } from 'echarts';
import { useChartsTheme, GraphSeries, PersesChartsTheme } from '@perses-dev/components';
import { Stack, Typography, SxProps } from '@mui/material';
import { FC, useMemo } from 'react';
import { applyValueMapping, Labels, createRegexFromString, TimeSeriesData, ValueMapping } from '@perses-dev/core';
import { PanelProps, PanelData } from '@perses-dev/plugin-system';
import { StatChartOptions } from './stat-chart-model';
import { convertSparkline } from './utils/data-transform';
import { calculateValue } from './utils/calculate-value';
import { getStatChartColor } from './utils/get-color';
import { StatChartBase, StatChartData } from './StatChartBase';

const MIN_WIDTH = 100;
const SPACING = 2;

export type StatChartPanelProps = PanelProps<StatChartOptions, TimeSeriesData>;

export const StatChartPanel: FC<StatChartPanelProps> = (props) => {
  const { spec, contentDimensions, queryResults } = props;

  const { format, sparkline, valueFontSize: valueFontSize, colorMode, textMode, legendMode } = spec;
  const chartsTheme = useChartsTheme();
  const statChartData = useStatChartData(queryResults, spec, chartsTheme);

  const isMultiSeries = statChartData.length > 1;

  if (!contentDimensions) return null;

  // Calculates chart width
  const spacing = SPACING * (statChartData.length - 1);
  let chartWidth = (contentDimensions.width - spacing) / statChartData.length;
  if (isMultiSeries && chartWidth < MIN_WIDTH) {
    chartWidth = MIN_WIDTH;
  }

  const noDataTextStyle = (chartsTheme.noDataOption.title as TitleComponentOption).textStyle;

  return (
    <Stack
      height={contentDimensions.height}
      width={contentDimensions.width}
      spacing={`${SPACING}px`}
      direction="row"
      justifyContent={isMultiSeries ? 'left' : 'center'}
      alignItems="center"
      sx={{
        overflowX: isMultiSeries ? 'scroll' : 'auto',
      }}
    >
      {statChartData.length ? (
        statChartData.map((series, index) => {
          const sparklineConfig = convertSparkline(chartsTheme, series.color, sparkline);

          return (
            <StatChartBase
              key={index}
              width={chartWidth}
              height={contentDimensions.height}
              data={series}
              format={format}
              sparkline={sparklineConfig}
              valueFontSize={valueFontSize}
              colorMode={colorMode}
              textMode={textMode}
              isMultiSeries={isMultiSeries}
              legendMode={legendMode}
            />
          );
        })
      ) : (
        <Typography sx={{ ...noDataTextStyle } as SxProps}>No data</Typography>
      )}
    </Stack>
  );
};

const useStatChartData = (
  queryResults: Array<PanelData<TimeSeriesData>>,
  spec: StatChartOptions,
  chartsTheme: PersesChartsTheme
): StatChartData[] => {
  return useMemo(() => {
    const { calculation, mappings, metricLabel, textMode } = spec;

    const statChartData: StatChartData[] = [];

    // Count total series to determine if multi-series
    const totalSeries = queryResults.reduce((sum, result) => sum + result.data.series.length, 0);
    const isMultiSeries = totalSeries > 1;

    for (const result of queryResults) {
      for (const seriesData of result.data.series) {
        const numericValue = calculateValue(calculation, seriesData);

        // Get label if metricLabel is set
        const labelValue = getLabelValue(metricLabel, seriesData.labels);

        // Use formattedName (with legend format applied) or fallback to raw name
        const formattedSeriesName = seriesData.formattedName ?? seriesData.name;

        // Determine what to display based on textMode
        const { displayValue, displayName } = getDisplayContent({
          textMode: textMode ?? 'auto',
          numericValue,
          labelValue,
          seriesName: formattedSeriesName,
          isMultiSeries,
          mappings,
        });

        // Color based on numeric value (always)
        const color = getStatChartColor(chartsTheme, spec, numericValue);

        const series: GraphSeries = {
          name: formattedSeriesName,
          values: seriesData.values,
        };

        statChartData.push({
          numericValue,
          displayValue,
          displayName,
          seriesData: series,
          color,
        });
      }
    }
    return statChartData;
  }, [queryResults, spec, chartsTheme]);
};

const getDisplayContent = ({
  textMode,
  numericValue,
  labelValue,
  seriesName,
  mappings,
  isMultiSeries,
}: {
  textMode: string;
  numericValue?: number | null;
  labelValue?: string;
  seriesName: string;
  mappings?: ValueMapping[];
  isMultiSeries: boolean;
}): { displayValue?: string | number | null; displayName?: string } => {
  const formattedValue = getValueOrLabel(numericValue, mappings, labelValue);

  switch (textMode) {
    case 'value':
      return {
        displayValue: formattedValue,
        displayName: undefined,
      };
    case 'name':
      return {
        displayValue: seriesName,
        displayName: undefined,
      };
    case 'value_and_name':
      return {
        displayValue: formattedValue,
        displayName: seriesName,
      };
    case 'none':
      return {
        displayValue: undefined,
        displayName: undefined,
      };
    case 'auto':
    default:
      return {
        displayValue: formattedValue,
        displayName: isMultiSeries ? seriesName : undefined,
      };
  }
};

const getValueOrLabel = (
  value?: number | null,
  mappings?: ValueMapping[],
  label?: string
): string | number | undefined | null => {
  if (label) {
    return label;
  }
  if (mappings?.length && value !== undefined && value !== null) {
    return applyValueMapping(value, mappings).value;
  } else {
    return value;
  }
};

const getLabelValue = (fieldLabel?: string, labels?: Labels): string | undefined => {
  if (!labels || !fieldLabel) {
    return undefined;
  }
  for (const [key, value] of Object.entries(labels)) {
    const regex = createRegexFromString(fieldLabel);
    if (regex.test(key)) {
      return value;
    }
  }
  return undefined;
};
