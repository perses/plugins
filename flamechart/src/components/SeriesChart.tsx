// Copyright 2025 The Perses Authors
// Licensed under the Apache License |  Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing |  software
// distributed under the License is distributed on an "AS IS" BASIS |
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND |  either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ReactElement, useMemo, useRef } from 'react';
import { Stack, useTheme } from '@mui/material';
import { ProfileData, Timeline } from '@perses-dev/core';
import { useChartsTheme, EChart, ZoomEventData, OnEventsType, enableDataZoom } from '@perses-dev/components';
import { useTimeRange } from '@perses-dev/plugin-system';
import type { EChartsCoreOption, LineSeriesOption } from 'echarts';
import { ECharts as EChartsInstance } from 'echarts/core';
import { formatItemValue } from '../utils/format';

const DEFAULT_LINE_WIDTH = 1.25;
const POINT_SIZE_OFFSET = 2;

export interface SeriesChartProps {
  width: number;
  height: number;
  data: ProfileData;
}

export interface SeriesSample {
  id: number;
  value: [number, number];
}

export function SeriesChart(props: SeriesChartProps): ReactElement {
  const { width, height, data } = props;

  const chartsTheme = useChartsTheme();
  const theme = useTheme();
  const { setTimeRange } = useTimeRange();
  const chartRef = useRef<EChartsInstance>();

  const handleEvents: OnEventsType<LineSeriesOption['data'] | unknown> = useMemo(() => {
    return {
      datazoom: (params): void => {
        if (params.batch[0] === undefined) return;
        const xAxisStartValue = params.batch?.[0]?.startValue;
        const xAxisEndValue = params.batch?.[0]?.endValue;
        if (xAxisStartValue !== undefined && xAxisEndValue !== undefined) {
          const zoomEvent: ZoomEventData = {
            start: xAxisStartValue,
            end: xAxisEndValue,
          };
          setTimeRange({ start: new Date(zoomEvent.start), end: new Date(zoomEvent.end) });
        }
      },
      finished: (): void => {
        if (chartRef.current !== undefined) {
          enableDataZoom(chartRef.current);
        }
      },
    };
  }, [setTimeRange]);

  const timeLine: Timeline = useMemo(() => {
    return data.timeline || ({} as Timeline);
  }, [data]);

  const seriesData: SeriesSample[] = useMemo(() => {
    const startTime = timeLine.startTime;
    const durationDelta = timeLine.durationDelta;
    console.log(timeLine.samples);
    return timeLine.samples.map((sample, index) => ({
      id: index,
      value: [(startTime + index * durationDelta) * 1000, Number(sample)],
    }));
  }, [timeLine]);

  const option: EChartsCoreOption = useMemo(() => {
    const seriesMapping = {
      type: 'line',
      color: theme.palette.primary.main,
      sampling: 'lttb',
      showSymbol: true,
      showAllSymbol: true,
      symbolSize: DEFAULT_LINE_WIDTH + POINT_SIZE_OFFSET,
      lineStyle: {
        width: DEFAULT_LINE_WIDTH,
        opacity: 0.95,
      },
      areaStyle: {
        opacity: 0,
      },
      emphasis: {
        disabled: true,
      },
      // selectedMode: 'single',
      data: seriesData,
    };

    const option: EChartsCoreOption = {
      //dataset: seriesData,
      series: seriesMapping,
      xAxis: {
        type: 'time',
        min: timeLine.startTime * 1000,
        max: (timeLine.startTime + timeLine.samples.length * timeLine.durationDelta) * 1000,
        axisLabel: {
          hideOverlap: true,
        },
        axisPointer: {
          snap: false, // important so shared crosshair does not lag
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            return formatItemValue(data.metadata?.units, value);
          },
        },
      },
      animation: false,
      tooltip: {
        show: true,
        showContent: true,
        trigger: 'axis',
        appendToBody: true,
      },
      axisPointer: {
        type: 'line',
        z: 0, // ensure point symbol shows on top of dashed line
        triggerEmphasis: false, // https://github.com/apache/echarts/issues/18495
        triggerTooltip: false,
        snap: false, // xAxis.axisPointer.snap takes priority
      },
      toolbox: {
        feature: {
          dataZoom: {
            icon: null, // https://stackoverflow.com/a/67684076/17575201
            yAxisIndex: 'none',
          },
        },
      },
      grid: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      },
    };

    return option;
  }, [timeLine, data.metadata?.units, seriesData, theme]);

  const seriesChart = useMemo(
    () => (
      <EChart
        sx={{
          width: width,
          height: height,
        }}
        option={option}
        theme={chartsTheme.echartsTheme}
        onEvents={handleEvents}
        _instance={chartRef}
      />
    ),
    [chartsTheme.echartsTheme, height, option, width, handleEvents]
  );

  return (
    <Stack width={width} height={height} alignItems="center" justifyContent="center">
      {seriesChart}
    </Stack>
  );
}
