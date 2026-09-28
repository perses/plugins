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

import { Box, useTheme } from '@mui/material';
import type {
  ChartInstance,
  ZoomEventData,
  SelectedLegendItemState,
  TableColumnConfig,
  LegendItem,
  LegendProps,
  TooltipConfig,
  TimeChartSeriesMapping,
  StepOptions,
} from '@perses-dev/components';
import {
  YAxisLabel,
  useChartsTheme,
  ContentWithLegend,
  useId,
  DEFAULT_TOOLTIP_CONFIG,
  getFormattedMultipleYAxes,
  DEFAULT_LEGEND,
  formatValue,
  getTimeSeriesValues,
} from '@perses-dev/components';
import { usePanelAnnotationsWithData } from '@perses-dev/dashboards';
import type { PanelProps, CalculationType } from '@perses-dev/plugin-system';
import {
  LEGEND_VALUE_CONFIG,
  useTimeRange,
  validateLegendSpec,
  legendValues,
  getCalculations,
} from '@perses-dev/plugin-system';
import type { Labels, TimeSeries, TimeSeriesData, TimeSeriesValueTuple } from '@perses-dev/spec';
import type { GridComponentOption } from 'echarts';
import merge from 'lodash/merge';
import type { ReactElement } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';

import type { TimeSeriesChartOptions } from './time-series-chart-model';
import { DEFAULT_FORMAT, DEFAULT_VISUAL, THRESHOLD_PLOT_INTERVAL } from './time-series-chart-model';
import { TimeSeriesChartBase } from './TimeSeriesChartBase';
import type { TimeSeriesAnnotation } from './utils/annotation';
import { convertAnnotationToTimeSeriesAnnotation } from './utils/annotation';
import type { ExemplarChartData } from './utils/data-transform';
import {
  getTimeSeries,
  getCommonTimeScaleForQueries,
  convertPanelYAxis,
  getThresholdSeries,
  convertPercentThreshold,
} from './utils/data-transform';
import { getSeriesColor } from './utils/palette-gen';

export type TimeSeriesChartProps = PanelProps<TimeSeriesChartOptions, TimeSeriesData>;

/**
 * Stable string key for a labels record, so exemplars can be matched to their
 * series regardless of the labels order.
 */
function labelsKey(labels: Labels): string {
  return JSON.stringify(
    Object.keys(labels)
      .toSorted()
      .map((labelName) => [labelName, labels[labelName]]),
  );
}

// Using an "ALL" value to handle the case on first loading the chart where we
// want to select all, but do not want all of the legend items to be visually highlighted.
// This helps us differentiate those cases more clearly instead of inferring it
// based on the state of the data. This also helps us avoid some coding
// complexity around initializing a full record for the initial load that would
// currently require significantly more refactoring of this component.
// TODO: simplify this if we switch the list-based legend UI to use checkboxes,
// where we *would* want to visually select all items in this case.

function TimeSeriesChartPanelComponent(props: TimeSeriesChartProps): ReactElement | null {
  const {
    spec: { thresholds, yAxis, tooltip, querySettings: querySettingsList },
    contentDimensions,
    queryResults,
  } = props;
  const chartsTheme = useChartsTheme();
  const muiTheme = useTheme();
  const chartId = useId('time-series-panel');

  const chartRef = useRef<ChartInstance>(null);

  // ECharts theme comes from ChartsProvider, more info: https://echarts.apache.org/en/option.html#color
  // Colors are manually applied since our legend and tooltip are built custom with React.
  const categoricalPalette = chartsTheme.echartsTheme.color;

  // TODO: consider refactoring how the layout/spacing/alignment are calculated
  // the next time significant changes are made to the time series panel (e.g.
  // when making improvements to the legend to more closely match designs).
  // This may also want to include moving some of this logic down to the shared,
  // embeddable components.
  const contentPadding = chartsTheme.container.padding.default;
  const adjustedContentDimensions: typeof contentDimensions = contentDimensions
    ? {
        width: contentDimensions.width - contentPadding * 2,
        height: contentDimensions.height - contentPadding * 2,
      }
    : undefined;

  // populate default 'position' and other future properties
  const legend = useMemo(() => {
    return props.spec.legend && validateLegendSpec(props.spec.legend)
      ? merge({}, DEFAULT_LEGEND, props.spec.legend)
      : undefined;
  }, [props.spec.legend]);

  // TODO: add support for y_axis_alt.format
  const format = props.spec.yAxis?.format ?? DEFAULT_FORMAT;

  // ensures there are fallbacks for unset properties since most
  // users should not need to customize visual display
  const visual = useMemo(() => {
    return merge({}, DEFAULT_VISUAL, props.spec.visual);
  }, [props.spec.visual]);

  // convert Perses dashboard format to be ECharts compatible
  const echartsYAxis = useMemo(() => {
    return convertPanelYAxis(yAxis);
  }, [yAxis]);

  // Collect unique formats from query settings that differ from the base format
  // These will create additional Y axes on the right side
  const { additionalFormats, formatToYAxisIndex } = useMemo(() => {
    const baseUnit = format?.unit ?? 'decimal';
    const additionalFormats: Array<typeof format> = [];
    const formatToYAxisIndex = new Map<string, number>();

    // Index 0 is reserved for the base Y axis
    formatToYAxisIndex.set(baseUnit, 0);

    // Collect unique formats from query settings
    for (const qs of querySettingsList ?? []) {
      if (qs.format?.unit && qs.format.unit !== baseUnit) {
        const unitKey = qs.format.unit;
        if (!formatToYAxisIndex.has(unitKey)) {
          // Add new format - index is 1 + position in additionalFormats array
          formatToYAxisIndex.set(unitKey, 1 + additionalFormats.length);
          additionalFormats.push(qs.format);
        }
      }
    }

    return { additionalFormats, formatToYAxisIndex };
  }, [format, querySettingsList]);

  const [selectedLegendItems, setSelectedLegendItems] = useState<SelectedLegendItemState>('ALL');
  const [legendSorting, setLegendSorting] = useState<NonNullable<LegendProps['tableProps']>['sorting']>();

  const { setTimeRange } = useTimeRange();

  const annotationsWithData = usePanelAnnotationsWithData(props.definition?.spec.annotations);

  const annotations: TimeSeriesAnnotation[] = useMemo(
    () => convertAnnotationToTimeSeriesAnnotation(annotationsWithData),
    [annotationsWithData],
  );

  const calculationTypes = legend?.values;

  // Point processing and legend statistics depend on query data, not legend selection.
  // Reuse these arrays when toggling series instead of rescanning every sample.
  const { timeScale, preparedQueries } = useMemo(() => {
    const commonScale = getCommonTimeScaleForQueries(queryResults);
    const settingsByQuery = new Map(querySettingsList?.map((settings) => [settings.queryIndex, settings]));
    let seriesIndex = 0;
    const queries = commonScale
      ? queryResults.map((result, queryIndex) => {
          const querySettings = settingsByQuery.get(queryIndex);
          const series = result.data.series.map((timeSeries) => {
            const baseValues = getTimeSeriesValues(timeSeries, commonScale);
            const values = querySettings?.negativeY
              ? baseValues.map(([t, v]): TimeSeriesValueTuple => [t, v === null ? null : -v])
              : baseValues;
            const calculations = calculationTypes
              ? getCalculations(timeSeries.values, calculationTypes as CalculationType[])
              : undefined;
            let maxValue = 0;
            if (querySettings?.format?.unit) {
              for (const [, value] of timeSeries.values) {
                maxValue = Math.max(maxValue, Math.abs(value ?? 0));
              }
            }
            const seriesId = `${chartId}${timeSeries.name}${seriesIndex}`;
            seriesIndex += 1;
            return { timeSeries, seriesId, values, calculations, maxValue };
          });
          return { querySettings, series, exemplars: result.data.exemplars };
        })
      : [];
    return { timeScale: commonScale, preparedQueries: queries };
  }, [queryResults, querySettingsList, calculationTypes, chartId]);

  // Prepare all exemplar groups independently of legend selection. The base chart
  // filters their scatter series without rebuilding marker data for visible groups.
  const chartExemplars = useMemo(() => {
    const groups: ExemplarChartData[] = [];
    let seriesIndex = 0;
    for (const { querySettings, series, exemplars } of preparedQueries) {
      // Labels identify a series within a query, not across different queries.
      const seriesByLabels = new Map<string, ExemplarChartData>();
      for (const { timeSeries, seriesId } of series) {
        const seriesName = timeSeries.formattedName ?? timeSeries.name;
        if (exemplars?.length && timeSeries.labels) {
          seriesByLabels.set(labelsKey(timeSeries.labels), {
            seriesId,
            seriesName,
            color: getSeriesColor({
              categoricalPalette: categoricalPalette as string[],
              visual,
              muiPrimaryColor: muiTheme.palette.primary.main,
              seriesName,
              seriesIndex,
              querySettings,
              queryHasMultipleResults: series.length > 1,
            }),
            seriesLabels: timeSeries.labels,
            yAxisIndex: formatToYAxisIndex.get(querySettings?.format?.unit ?? '') ?? 0,
            negativeY: querySettings?.negativeY,
            exemplars: [],
          });
        }
        seriesIndex++;
      }
      for (const group of exemplars ?? []) {
        if (group.exemplars.length === 0) continue;
        const matched = seriesByLabels.get(labelsKey(group.seriesLabels));
        if (matched) groups.push({ ...matched, exemplars: group.exemplars });
      }
    }
    return groups;
  }, [preparedQueries, categoricalPalette, visual, muiTheme.palette.primary.main, formatToYAxisIndex]);

  // Populate series data based on query results
  const {
    timeChartData,
    timeSeriesMapping,
    legendItems,
    seriesFormatMap: computedSeriesFormatMap,
    maxValuesByFormat,
  } = useMemo(() => {
    if (timeScale === undefined) {
      return {
        timeChartData: [] as TimeSeries[],
        timeSeriesMapping: [] as TimeChartSeriesMapping,
        legendItems: [] as LegendItem[],
        seriesFormatMap: new Map(),
        maxValuesByFormat: new Map<string, number>(),
      };
    }

    const legendItems: LegendItem[] = [];

    // Utilizes ECharts dataset so raw data is separate from series option style properties
    // https://apache.github.io/echarts-handbook/en/concepts/dataset/
    const timeChartData: TimeSeries[] = [];
    const timeSeriesMapping: TimeChartSeriesMapping = [];

    // Track max values for each format unit (used for dynamic Y axis offset calculation)
    const maxValuesByFormat = new Map<string, number>();
    const seriesFormatMap = new Map<string, typeof format>();

    let visibleSeriesCount = 0;
    for (const { series } of preparedQueries) {
      for (const { seriesId } of series) {
        if (selectedLegendItems === 'ALL' || selectedLegendItems[seriesId]) visibleSeriesCount++;
      }
    }

    // Index is counted across multiple queries which ensures the categorical color palette does not reset for every query
    let seriesIndex = 0;

    for (const { querySettings, series } of preparedQueries) {
      for (const { timeSeries, seriesId, values, calculations, maxValue } of series) {
        // Format is determined by seriesNameFormat in query spec
        const formattedSeriesName = timeSeries.formattedName ?? timeSeries.name;

        // Color is used for line, tooltip, and legend
        const seriesColor = getSeriesColor({
          // ECharts type for color is not always an array but it is always an array in ChartsProvider
          categoricalPalette: categoricalPalette as string[],
          visual,
          muiPrimaryColor: muiTheme.palette.primary.main,
          seriesName: formattedSeriesName,
          seriesIndex,
          querySettings: querySettings,
          queryHasMultipleResults: series.length > 1,
        });

        // When we initially load the chart, we want to show all series, but
        // DO NOT want to visualy highlight all the items in the legend.
        const isSelectAll = selectedLegendItems === 'ALL';
        const isSelected = !isSelectAll && !!selectedLegendItems[seriesId];
        const showTimeSeries = isSelected || isSelectAll;

        if (showTimeSeries) {
          // Use timeChartData.length to ensure the data that is passed into the tooltip accounts for
          // which legend items are selected. This must happen before timeChartData.push to avoid an
          // off-by-one error, seriesIndex cannot be used since it's needed to cycle through palette
          const datasetIndex = timeChartData.length;

          // Determine yAxisIndex based on the query's format setting
          const queryFormat = querySettings?.format;
          const yAxisIndex = queryFormat?.unit ? (formatToYAxisIndex.get(queryFormat.unit) ?? 0) : 0;

          // Each series is stored as a separate dataset source.
          // https://apache.github.io/echarts-handbook/en/concepts/dataset/#how-to-reference-several-datasets
          timeSeriesMapping.push(
            getTimeSeries(
              seriesId,
              datasetIndex,
              formattedSeriesName,
              visual,
              timeScale,
              seriesColor,
              querySettings,
              yAxisIndex,
              visibleSeriesCount,
            ),
          );

          // Store the format for this series for tooltip formatting
          if (queryFormat) {
            seriesFormatMap.set(seriesId, queryFormat);

            // Track max value for this format unit (used for dynamic Y axis offset calculation)
            const unitKey = queryFormat.unit;
            if (unitKey) {
              const currentMax = maxValuesByFormat.get(unitKey) ?? 0;
              if (maxValue > currentMax) {
                maxValuesByFormat.set(unitKey, maxValue);
              }
            }
          }

          timeChartData.push({
            name: formattedSeriesName,
            values,
          });
        }

        if (legend && legendItems) {
          legendItems.push({
            id: seriesId, // Avoids duplicate key console errors when there are duplicate series names
            label: formattedSeriesName,
            color: seriesColor,
            data: calculations,
          });
        }

        // Used for repeating colors in Categorical palette
        seriesIndex += 1;
      }
    }

    // map thresholds only if there is at least one time series to avoid displaying thresholds without any data
    if (thresholds && thresholds.steps && timeChartData.length > 0) {
      // Convert how thresholds are defined in the panel spec to valid ECharts 'line' series.
      // These are styled with predefined colors and a dashed style to look different than series from query results.
      // Regular series are used instead of markLines since thresholds currently show in our React TimeSeriesTooltip.
      const thresholdsColors = chartsTheme.thresholds;
      const defaultThresholdColor = thresholds.defaultColor ?? thresholdsColors.defaultColor;
      thresholds.steps.forEach((step: StepOptions, index: number) => {
        const stepPaletteColor = thresholdsColors.palette[index] ?? defaultThresholdColor;
        const thresholdLineColor = step.color ?? stepPaletteColor;
        const stepOption: StepOptions = {
          color: thresholdLineColor,
          value:
            // yAxis is passed here since it corresponds to dashboard JSON instead of the already converted ECharts yAxis
            thresholds.mode === 'percent'
              ? convertPercentThreshold(step.value, timeChartData, yAxis?.max, yAxis?.min)
              : step.value,
        };
        const thresholdName = step.name ?? `Threshold ${index + 1}`;

        // Generates array of [time, step.value] where time ranges from timescale.startMs to timescale.endMs with an interval of 15s
        const thresholdTimeValueTuple: TimeSeriesValueTuple[] = [];
        let currentTimestamp = timeScale.startMs;
        while (currentTimestamp <= timeScale.endMs) {
          thresholdTimeValueTuple.push([currentTimestamp, stepOption.value]);
          // Used to plot fake thresholds datapoints so correct nearby threshold series shows in tooltip without flicker
          currentTimestamp += 1000 * THRESHOLD_PLOT_INTERVAL;
        }

        timeChartData.push({
          name: thresholdName,
          values: thresholdTimeValueTuple,
        });
        timeSeriesMapping.push(getThresholdSeries(thresholdName, stepOption, seriesIndex));
        seriesIndex++;
      });
    }

    return {
      timeScale,
      timeChartData,
      timeSeriesMapping,
      legendItems,
      seriesFormatMap,
      maxValuesByFormat,
    };
  }, [
    preparedQueries,
    timeScale,
    thresholds,
    selectedLegendItems,
    legend,
    visual,
    yAxis?.max,
    yAxis?.min,
    categoricalPalette,
    chartsTheme.thresholds,
    muiTheme.palette.primary.main,
    formatToYAxisIndex,
  ]);

  // Create multiple Y axes if there are additional formats
  // Uses max values from data to compute dynamic offsets that adapt to label widths
  const multipleYAxes = useMemo(() => {
    if (additionalFormats.length === 0) {
      return undefined; // Use single Y axis (default behavior)
    }
    // Build array of max values for each additional format (in order)
    const maxValues = additionalFormats.map((fmt) => {
      const unitKey = fmt.unit;
      return unitKey ? (maxValuesByFormat?.get(unitKey) ?? 1000) : 1000;
    });
    return getFormattedMultipleYAxes(echartsYAxis, format, additionalFormats, maxValues);
  }, [echartsYAxis, format, additionalFormats, maxValuesByFormat]);

  // Translate the legend values into columns for the table legend.
  const legendColumns = useMemo(() => {
    if (!legend?.values) {
      return [];
    }

    // Iterating the predefined list of possible values to retain a specific
    // intended order of values.
    return legendValues.reduce(
      (columns, legendValue) => {
        const legendConfig = LEGEND_VALUE_CONFIG[legendValue];

        if (legendConfig && legend?.values?.includes(legendValue)) {
          columns.push({
            accessorKey: `data.${legendValue}`,
            header: legendConfig.label,
            headerDescription: legendConfig.description,
            // Intentionally hardcoding a column width to start based on discussions
            // with design around keeping this simple to start. This may need
            // revisiting in the future to handle edge cases with very large values.
            width: 72,
            align: 'right',
            cell: ({ getValue }) => {
              const cellValue = getValue();
              return typeof cellValue === 'number' && format ? formatValue(cellValue, format) : cellValue;
            },
            cellDescription: true,
            enableSorting: true,
          });
        }

        return columns;
      },
      [] as Array<TableColumnConfig<LegendItem>>,
    );
  }, [legend?.values, format]);

  const gridOverrides: GridComponentOption = useMemo(() => {
    // When Y axes are hidden, disable containLabel to prevent auto-spacing, but add bottom padding for X axis
    return echartsYAxis.show === false
      ? {
          left: 0,
          right: 0,
          bottom: 30,
          containLabel: false,
        }
      : {
          left: yAxis && yAxis.label ? 30 : 20,
          // With containLabel: true in theme, ECharts auto-reserves space for axis labels.
          // For multiple right axes, add extra padding for the last axis labels that extend beyond the grid.
          right: additionalFormats.length > 0 ? 10 : 20,
          bottom: 0,
          containLabel: true,
        };
  }, [echartsYAxis.show, yAxis, additionalFormats.length]);

  const handleDataZoom = useCallback(
    (event: ZoomEventData): void => {
      setTimeRange({ start: new Date(event.start), end: new Date(event.end) });
    },
    [setTimeRange],
  );

  if (adjustedContentDimensions === undefined) {
    return null;
  }

  // Used to opt in to ECharts trigger item which show subgroup data accurately.
  // Derived from the actual series mapping rather than `visual.stack` alone so that
  // bar charts stacked only via per-query overrides also use the right tooltip mode.
  const isStackedBar =
    visual.display === 'bar' && timeSeriesMapping.some((s) => s?.type === 'bar' && s.stack === 'all');

  // Turn on tooltip pinning by default but opt out for stacked bar or if explicitly set in tooltip panel spec
  let enablePinning = true;
  if (isStackedBar) {
    enablePinning = false;
  } else if (tooltip?.enablePinning !== undefined) {
    enablePinning = tooltip.enablePinning;
  }
  const tooltipConfig: TooltipConfig = {
    ...DEFAULT_TOOLTIP_CONFIG,
    enablePinning,
  };

  return (
    <Box sx={{ padding: `${contentPadding}px` }}>
      <ContentWithLegend
        width={adjustedContentDimensions.width}
        height={adjustedContentDimensions.height}
        // Making this small enough that the medium size doesn't get
        // responsive-handling-ed away when in the panel options editor.
        minChildrenHeight={50}
        legendSize={legend?.size}
        legendProps={
          legend && {
            options: legend,
            data: legendItems || [],
            selectedItems: selectedLegendItems,
            onSelectedItemsChange: setSelectedLegendItems,
            tableProps: {
              columns: legendColumns,
              sorting: legendSorting,
              onSortingChange: setLegendSorting,
            },
            onItemMouseOver: (e, { id }): void => {
              chartRef.current?.highlightSeries({ name: id });
            },
            onItemMouseOut: (): void => {
              chartRef.current?.clearHighlightedSeries();
            },
          }
        }
      >
        {({ height, width }) => {
          return (
            <Box style={{ height, width }}>
              {yAxis && yAxis.show && yAxis.label && <YAxisLabel name={yAxis.label} height={height} />}
              <TimeSeriesChartBase
                ref={chartRef}
                height={height}
                data={timeChartData}
                seriesMapping={timeSeriesMapping}
                exemplars={chartExemplars}
                annotations={annotations}
                timeScale={timeScale}
                yAxis={multipleYAxes ?? echartsYAxis}
                format={format}
                seriesFormatMap={computedSeriesFormatMap}
                grid={gridOverrides}
                isStackedBar={isStackedBar}
                tooltipConfig={tooltipConfig}
                syncGroup="default-panel-group" // TODO: make configurable from dashboard settings and per panel-group overrides
                onDataZoom={handleDataZoom}
                //  Show an empty chart when there is no data because the user unselected all items in
                // the legend. Otherwise, show a "no data" message.
                noDataVariant={!timeChartData.length && legendItems && legendItems.length > 0 ? 'chart' : 'message'}
              />
            </Box>
          );
        }}
      </ContentWithLegend>
    </Box>
  );
}

// PanelContent recreates the queryResults array and its wrappers on dashboard
// hover/focus updates. Compare the underlying references in query order so those
// updates do not invalidate data preparation or scan the samples and exemplars.
export const TimeSeriesChartPanel = memo(
  TimeSeriesChartPanelComponent,
  (previous, next): boolean =>
    previous.spec === next.spec &&
    previous.definition === next.definition &&
    previous.contentDimensions?.width === next.contentDimensions?.width &&
    previous.contentDimensions?.height === next.contentDimensions?.height &&
    previous.queryResults.length === next.queryResults.length &&
    previous.queryResults.every(
      (query, index) =>
        query.data === next.queryResults[index]?.data && query.definition === next.queryResults[index]?.definition,
    ),
);
