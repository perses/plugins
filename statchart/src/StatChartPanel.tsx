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

import type { SxProps } from '@mui/material';
import { Stack, Typography } from '@mui/material';
import type { GraphSeries, PersesChartsTheme, ValueMapping } from '@perses-dev/components';
import { useChartsTheme, applyValueMapping, createRegexFromString } from '@perses-dev/components';
import type { PanelProps, PanelData } from '@perses-dev/plugin-system';
import type { Labels, TimeSeriesData } from '@perses-dev/spec';
import type { TitleComponentOption } from 'echarts';
import type { FC } from 'react';
import { useMemo } from 'react';

import type { StatChartOptions } from './stat-chart-model';
import { resolveSeriesColumns } from './stat-chart-model';
import type { StatChartData } from './StatChartBase';
import { StatChartBase } from './StatChartBase';
import { measureTextWidth } from './utils/calculate-font-size';
import { calculateValue } from './utils/calculate-value';
import { convertSparkline } from './utils/data-transform';
import { formatStatChartValue } from './utils/format-stat-chart-value';
import { getStatChartColor } from './utils/get-color';

const SPACING = 2;

export type StatChartPanelProps = PanelProps<StatChartOptions, TimeSeriesData>;

export const StatChartPanel: FC<StatChartPanelProps> = (props) => {
  const { spec, contentDimensions, queryResults } = props;

  const { format, sparkline, valueFontSize, legendFontSize, colorMode, seriesLayout, seriesColumns } = spec;
  const chartsTheme = useChartsTheme();
  const statChartData = useStatChartData(queryResults, spec, chartsTheme);

  const isMultiSeries = statChartData.length > 1;

  // Find the widest value text (by pixel width) to use as alignment reference
  const alignmentText = useMemo(() => {
    if (!isMultiSeries) return undefined;
    const fontFamily = chartsTheme.echartsTheme.textStyle?.fontFamily ?? 'Lato';
    const fontSize = Number(chartsTheme.echartsTheme.textStyle?.fontSize) || 12;
    let widest = '';
    let maxWidth = 0;
    for (const series of statChartData) {
      const formatted = formatStatChartValue(series.calculatedValue, format);
      const width = measureTextWidth(formatted, 700, fontSize, fontFamily);
      if (width > maxWidth) {
        maxWidth = width;
        widest = formatted;
      }
    }
    return widest;
  }, [statChartData, format, isMultiSeries, chartsTheme.echartsTheme.textStyle]);

  // Find the longest series name (by pixel width) to unify legend sizing
  const alignmentSeriesName = useMemo(() => {
    if (!isMultiSeries) return undefined;
    const fontFamily = chartsTheme.echartsTheme.textStyle?.fontFamily ?? 'Lato';
    const fontSize = Number(chartsTheme.echartsTheme.textStyle?.fontSize) || 12;
    let widest = '';
    let maxWidth = 0;
    for (const series of statChartData) {
      const name = series.seriesData?.name ?? '';
      const width = measureTextWidth(name, 400, fontSize, fontFamily);
      if (width > maxWidth) {
        maxWidth = width;
        widest = name;
      }
    }
    return widest;
  }, [statChartData, isMultiSeries, chartsTheme.echartsTheme.textStyle]);

  // Handle three-state showLegend: 'on' | 'off' | 'auto' (or undefined for backward compatibility)
  let shouldShowLegend = isMultiSeries;
  if (spec.legendMode === 'on') {
    shouldShowLegend = true;
  } else if (spec.legendMode === 'off') {
    shouldShowLegend = false;
  }

  if (!contentDimensions) return null;

  // Multi-series: auto/grid matrix or legacy single row (see resolveSeriesColumns).
  const layoutMode = seriesLayout ?? 'auto';
  const cols = resolveSeriesColumns(statChartData.length, layoutMode, seriesColumns);
  const rows = Math.max(1, Math.ceil(statChartData.length / cols));
  const wrap = isMultiSeries && layoutMode !== 'row';
  const spacing = SPACING;
  let chartWidth = contentDimensions.width;
  if (wrap) {
    chartWidth = (contentDimensions.width - spacing * (cols - 1)) / cols;
  } else if (isMultiSeries) {
    chartWidth = (contentDimensions.width - spacing * (statChartData.length - 1)) / statChartData.length;
  }
  const chartHeight = wrap ? (contentDimensions.height - spacing * (rows - 1)) / rows : contentDimensions.height;

  let overflow: 'hidden' | 'auto' = 'hidden';
  if (!wrap && isMultiSeries) {
    overflow = 'auto';
  }
  const alignContent = wrap ? 'flex-start' : 'center';

  const noDataTextStyle = (chartsTheme.noDataOption.title as TitleComponentOption).textStyle;

  return (
    <Stack
      height={contentDimensions.height}
      width={contentDimensions.width}
      spacing={`${spacing}px`}
      direction="row"
      flexWrap={wrap ? 'wrap' : 'nowrap'}
      justifyContent={isMultiSeries ? 'flex-start' : 'center'}
      alignItems="stretch"
      useFlexGap
      sx={{
        overflow,
        alignContent,
      }}
    >
      {statChartData.length ? (
        statChartData.map((series, index) => {
          const sparklineConfig = convertSparkline(chartsTheme, series.color, sparkline);

          return (
            <StatChartBase
              key={index}
              width={chartWidth}
              height={chartHeight}
              data={series}
              format={format}
              sparkline={sparklineConfig}
              showSeriesName={shouldShowLegend}
              valueFontSize={valueFontSize}
              colorMode={colorMode}
              legendFontSize={legendFontSize}
              alignmentText={alignmentText}
              alignmentSeriesName={alignmentSeriesName}
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
  chartsTheme: PersesChartsTheme,
): StatChartData[] => {
  return useMemo(() => {
    const { calculation, mappings, metricLabel } = spec;

    const statChartData: StatChartData[] = [];
    for (const result of queryResults) {
      for (const seriesData of result.data.series) {
        const calculatedValue = calculateValue(calculation, seriesData);

        // get label metric value
        const labelValue = getLabelValue(metricLabel, seriesData.labels);

        // get actual value to display
        const displayValue = getValueOrLabel(calculatedValue, mappings, labelValue);

        const color = getStatChartColor(chartsTheme, spec, calculatedValue);

        const series: GraphSeries = {
          name: seriesData.formattedName ?? '',
          values: seriesData.values,
        };

        statChartData.push({ calculatedValue: displayValue, seriesData: series, color });
      }
    }
    return statChartData;
  }, [queryResults, spec, chartsTheme]);
};

const getValueOrLabel = (
  value?: number | null,
  mappings?: ValueMapping[],
  label?: string,
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
