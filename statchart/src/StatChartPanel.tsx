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
import type { StatChartData } from './StatChartBase';
import { StatChartBase } from './StatChartBase';
import { measureTextWidth } from './utils/calculate-font-size';
import { calculateValue } from './utils/calculate-value';
import { convertSparkline } from './utils/data-transform';
import { formatStatChartValue } from './utils/format-stat-chart-value';
import { getStatChartColor } from './utils/get-color';

const MIN_WIDTH = 100;
const SPACING = 2;

/**
 * Layout for multi-series stats.
 * - Default (few series): single horizontal row (historical behavior).
 * - When a one-row layout would shrink cells below MIN_WIDTH: wrap into a grid.
 *   Column count = max that keeps cell width ≥ MIN_WIDTH (e.g. 9 series → 3×3).
 */
export function multiSeriesLayout(
  seriesCount: number,
  containerWidth: number,
  containerHeight: number,
): { cols: number; rows: number; chartWidth: number; chartHeight: number; wrap: boolean } {
  if (seriesCount <= 1) {
    return {
      cols: 1,
      rows: 1,
      chartWidth: containerWidth,
      chartHeight: containerHeight,
      wrap: false,
    };
  }
  const singleRowWidth = (containerWidth - SPACING * (seriesCount - 1)) / seriesCount;
  const wrap = singleRowWidth < MIN_WIDTH;
  if (!wrap) {
    return {
      cols: seriesCount,
      rows: 1,
      wrap: false,
      chartWidth: Math.max(singleRowWidth, MIN_WIDTH),
      chartHeight: containerHeight,
    };
  }
  // Prefer a near-square grid, capped by how many MIN_WIDTH columns fit.
  const maxColsByWidth = Math.max(1, Math.floor((containerWidth + SPACING) / (MIN_WIDTH + SPACING)));
  const idealCols = Math.ceil(Math.sqrt(seriesCount));
  const cols = Math.max(2, Math.min(maxColsByWidth, idealCols, seriesCount));
  const rows = Math.ceil(seriesCount / cols);
  const spacingX = SPACING * Math.max(cols - 1, 0);
  const spacingY = SPACING * Math.max(rows - 1, 0);
  return {
    cols,
    rows,
    wrap: true,
    chartWidth: Math.max(MIN_WIDTH, (containerWidth - spacingX) / cols),
    chartHeight: Math.max(48, (containerHeight - spacingY) / rows),
  };
}

export type StatChartPanelProps = PanelProps<StatChartOptions, TimeSeriesData>;

export const StatChartPanel: FC<StatChartPanelProps> = (props) => {
  const { spec, contentDimensions, queryResults } = props;

  const { format, sparkline, valueFontSize, legendFontSize, colorMode } = spec;
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

  // Default: one horizontal row (unchanged). Wrap to 2 columns only when cells would be too narrow.
  const { chartWidth, chartHeight, wrap } = multiSeriesLayout(
    statChartData.length,
    contentDimensions.width,
    contentDimensions.height,
  );

  const noDataTextStyle = (chartsTheme.noDataOption.title as TitleComponentOption).textStyle;

  return (
    <Stack
      height={contentDimensions.height}
      width={contentDimensions.width}
      spacing={`${SPACING}px`}
      direction="row"
      flexWrap={wrap ? 'wrap' : 'nowrap'}
      justifyContent={isMultiSeries ? (wrap ? 'flex-start' : 'left') : 'center'}
      alignItems={wrap ? 'stretch' : 'center'}
      useFlexGap
      sx={{
        overflowX: wrap ? 'hidden' : isMultiSeries ? 'auto' : 'hidden',
        overflowY: wrap ? 'auto' : 'hidden',
        alignContent: wrap ? 'flex-start' : undefined,
        '&::-webkit-scrollbar': {
          width: '4px',
          height: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'transparent',
          borderRadius: '2px',
        },
        '&:hover::-webkit-scrollbar-thumb': {
          background: 'rgba(128, 128, 128, 0.4)',
        },
        scrollbarWidth: 'thin',
        scrollbarColor: 'transparent transparent',
        '&:hover': {
          scrollbarColor: 'rgba(128, 128, 128, 0.4) transparent',
        },
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
