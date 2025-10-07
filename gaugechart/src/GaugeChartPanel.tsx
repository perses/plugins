// Copyright 2023 The Perses Authors
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

import { Box, Skeleton, Stack } from '@mui/material';
import { useChartsTheme } from '@perses-dev/components';
import { CalculationsMap, DEFAULT_CALCULATION, FormatOptions, formatValue, TimeSeriesData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import type { GaugeSeriesOption } from 'echarts';
import merge from 'lodash/merge';
import { ReactElement, useMemo } from 'react';
import {
  DEFAULT_FORMAT,
  DEFAULT_MAX_PERCENT,
  DEFAULT_MAX_PERCENT_DECIMAL,
  GaugeChartOptions,
} from './gauge-chart-model';
import { convertThresholds, defaultThresholdInput } from './thresholds';
import { GaugeChartBase, GaugeSeries } from './GaugeChartBase';

const EMPTY_GAUGE_SERIES: GaugeSeries = { label: '', value: undefined };
const GAUGE_MIN_WIDTH = 90;
const PANEL_PADDING_OFFSET = 20;

/**
 * Calculate responsive progress width based on panel dimensions
 */
function getResponsiveProgressWidth(width: number, height: number): number {
  const MIN_WIDTH = 10;
  const MAX_WIDTH = 48;
  const RATIO = 0.1; // 10% of the smaller dimension
  const minSize = Math.min(width, height);
  // Use RATIO% of the smaller dimension as base, with reasonable min/max bounds
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(minSize * RATIO)));
}

/**
 * Responsive font size depending on number of characters and panel dimensions.
 * Uses clamp to ensure the text never overflows and scales appropriately with panel size.
 * (Value here refers to the main number value displayed inside the gauge)
 * TODO simplify
 */
function getResponsiveValueFontSize(
  value: number | null,
  format: FormatOptions,
  width: number,
  height: number
): string {
  const MIN_SIZE = 8;
  const formattedValue = typeof value === 'number' ? formatValue(value, format) : `${value}`;
  const valueCharacters = formattedValue.length ?? 2;

  // Calculate the available space for text within the gauge
  // The gauge occupies roughly 60% width of the detail area based on the configuration
  const availableWidth = width * 0.6;

  // Estimate character width (approximately 0.6 of font size for most fonts)
  const charWidthRatio = 0.6;

  // Calculate ideal font size based on available width and character count
  const idealFontSize = availableWidth / valueCharacters / charWidthRatio;

  // Scale with panel size but ensure it never overflows
  // Use a dynamic max size that grows with panel size but has reasonable limits
  const dynamicMaxSize = Math.max(24, Math.min(width * 0.15, height * 0.2));

  return `clamp(${MIN_SIZE}px, ${idealFontSize}px, ${dynamicMaxSize}px)`;
}

/**
 * Calculate responsive title font size based on panel dimensions
 * (title is the text displayed below the gauge as a legend)
 */
function getResponsiveTitleFontSize(width: number, height: number): number {
  const MIN_SIZE = 10;
  const MAX_SIZE = 16;
  const minSize = Math.min(width, height);

  // Scale between MIN_SIZE and MAX_SIZE based on panel size
  // Use 6% of the smaller dimension as base
  const calculatedSize = Math.round(minSize * 0.06);

  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, calculatedSize));
}

export type GaugeChartPanelProps = PanelProps<GaugeChartOptions, TimeSeriesData>;

export function GaugeChartPanel(props: GaugeChartPanelProps): ReactElement | null {
  const { spec: pluginSpec, contentDimensions, queryResults } = props;
  const { calculation, max, legend } = pluginSpec;

  const { thresholds: thresholdsColors } = useChartsTheme();

  /* Legend setting just added to the cue schema
     This line assures that if legend setting doesn't exist (for old gauge setting records),
     The legend shows normally as before. If it exists, then it checks the show property.
  */
  const showLegend = legend?.show ?? true;

  // ensures all default format properties set if undef
  const format = merge({}, DEFAULT_FORMAT, pluginSpec.format);

  const thresholds = pluginSpec.thresholds ?? defaultThresholdInput;

  const gaugeData = useMemo((): GaugeSeries[] => {
    const seriesData: GaugeSeries[] = [];

    if (!queryResults[0]?.data?.series?.length) {
      return seriesData;
    }

    if (!CalculationsMap[calculation]) {
      console.warn(`Invalid GaugeChart panel calculation ${calculation}, fallback to ${DEFAULT_CALCULATION}`);
    }

    const calculate = CalculationsMap[calculation] ?? CalculationsMap[DEFAULT_CALCULATION];

    for (const timeSeries of queryResults[0].data.series) {
      seriesData.push({
        value: calculate(timeSeries.values),
        label: showLegend ? (timeSeries.formattedName ?? '') : '',
      });
    }
    return seriesData;
  }, [queryResults, calculation, showLegend]);

  if (!contentDimensions) return null;

  // needed for end value of last threshold color segment
  let thresholdMax = max;
  if (thresholdMax === undefined) {
    thresholdMax = format.unit === 'percent' ? DEFAULT_MAX_PERCENT : DEFAULT_MAX_PERCENT_DECIMAL;
  }
  const axisLineColors = convertThresholds(thresholds, format, thresholdMax, thresholdsColors);

  // accounts for showing a separate chart for each time series
  let chartWidth = contentDimensions.width / gaugeData.length - PANEL_PADDING_OFFSET;
  if (chartWidth < GAUGE_MIN_WIDTH && gaugeData.length > 1) {
    // enables horizontal scroll when charts overflow outside of panel
    chartWidth = GAUGE_MIN_WIDTH;
  }

  // Calculate responsive values based on chart dimensions
  const progressWidth = getResponsiveProgressWidth(chartWidth, contentDimensions.height);
  const axisLineWidth = Math.round(progressWidth * 0.2); // Axis line width is 20% of progress width
  const titleFontSize = getResponsiveTitleFontSize(chartWidth, contentDimensions.height);

  const axisLine: GaugeSeriesOption['axisLine'] = {
    show: true,
    lineStyle: {
      width: axisLineWidth,
      color: axisLineColors,
    },
  };

  // no data message handled inside chart component
  if (!gaugeData.length) {
    const emptyValueFontSize = getResponsiveValueFontSize(
      null,
      format,
      contentDimensions.width,
      contentDimensions.height
    );
    const emptyProgressWidth = getResponsiveProgressWidth(contentDimensions.width, contentDimensions.height);
    const emptyTitleFontSize = getResponsiveTitleFontSize(contentDimensions.width, contentDimensions.height);

    return (
      <GaugeChartBase
        width={contentDimensions.width}
        height={contentDimensions.height}
        data={EMPTY_GAUGE_SERIES}
        format={format}
        axisLine={axisLine}
        max={thresholdMax}
        valueFontSize={emptyValueFontSize}
        progressWidth={emptyProgressWidth}
        titleFontSize={emptyTitleFontSize}
      />
    );
  }

  const hasMultipleCharts = gaugeData.length > 1;

  return (
    <Stack
      direction="row"
      spacing={hasMultipleCharts ? 2 : 0}
      justifyContent={hasMultipleCharts ? 'left' : 'center'}
      alignItems="center"
      sx={{
        // so scrollbar only shows when necessary
        overflowX: gaugeData.length > 1 ? 'scroll' : 'auto',
      }}
    >
      {gaugeData.map((series, seriesIndex) => {
        const fontSize = getResponsiveValueFontSize(series.value ?? null, format, chartWidth, contentDimensions.height);

        return (
          <Box key={`gauge-series-${seriesIndex}`}>
            <GaugeChartBase
              width={chartWidth}
              height={contentDimensions.height}
              data={series}
              format={format}
              axisLine={axisLine}
              max={thresholdMax}
              valueFontSize={fontSize}
              progressWidth={progressWidth}
              titleFontSize={titleFontSize}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

export function GaugeChartLoading({ contentDimensions }: GaugeChartPanelProps): React.ReactElement | null {
  if (!contentDimensions) return null;
  return (
    <Skeleton
      sx={{ margin: '0 auto' }}
      variant="circular"
      width={contentDimensions.width > contentDimensions.height ? contentDimensions.height : contentDimensions.width}
      height={contentDimensions.height}
    />
  );
}
