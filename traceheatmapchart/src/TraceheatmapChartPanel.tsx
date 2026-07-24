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

import { PanelProps } from '@perses-dev/plugin-system';
import { ReactElement, useMemo, useRef } from 'react';
import { TraceData } from '@perses-dev/spec';
import { EChart, useChartsContext } from '@perses-dev/components';
import { ECharts as EChartsInstance } from 'echarts/core';
import { EChartsOption } from 'echarts';
import { Box, Typography } from '@mui/material';
import { TraceheatmapOptions } from './traceheatmap-chart-model';
import { FlatQueryResults, getHeatmapChartData, getPlotterData } from './traceheatmap-chart-data-util';
import { createBucketToolTip } from './traceheatmap-tooltip-util';

export type TraceheatmapChartProps = PanelProps<TraceheatmapOptions, TraceData>;

export const TraceheatmapChartPanel = (props: TraceheatmapChartProps): ReactElement => {
  const {
    queryResults,
    spec: {
      bucketSettings: { base },
    },
  } = props;

  const chartRef = useRef<EChartsInstance>();
  const { chartsTheme } = useChartsContext();

  const allFlatResults = useMemo(() => {
    const allFlatResults: FlatQueryResults = [];
    queryResults.forEach((qr) => {
      (qr.data.searchResult || []).forEach((sr) => {
        allFlatResults.push({ ...sr });
      });
    });
    return allFlatResults;
  }, [queryResults]);

  const { bucketCountMap, bucketToFlatResultsMap, durationBuckets, maxBucketCount, minBucketCount, timeBuckets } =
    useMemo(() => {
      return getHeatmapChartData(allFlatResults, base);
    }, [allFlatResults, base]);

  const data = useMemo(() => {
    return getPlotterData(bucketCountMap, { showZero: false, zeroSubstitute: ' ' });
  }, [bucketCountMap]);

  if (
    [bucketCountMap, bucketToFlatResultsMap, timeBuckets, durationBuckets].some((i) => i === undefined || !i.length)
  ) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Typography>No data</Typography>
      </Box>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      appendTo: 'body',
      trigger: 'item',
      confine: false,
      formatter: (params) => {
        return createBucketToolTip(params, {
          bucketCountMap,
          bucketToFlatResultsMap,
          durationBuckets,
          timeBuckets,
          flatResults: allFlatResults,
        });
      },
    },
    grid: {
      top: 10,
      right: 10,
      bottom: 20,
      left: 20,
    },
    xAxis: {
      type: 'category',
      data: timeBuckets.map((tb) => tb.label),
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: 'category',
      data: durationBuckets.map((db) => db.label),
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: minBucketCount,
      max: maxBucketCount,
      calculable: true,
      show: false,
    },
    series: [
      {
        name: 'Traces',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  return (
    <Box id="traceheatmap-container" sx={{ width: '100%', height: '100%', display: 'flex', minHeight: 0 }}>
      <EChart
        sx={{
          width: '100%',
          height: '100%',
        }}
        option={option}
        theme={chartsTheme.echartsTheme}
        _instance={chartRef}
      />
    </Box>
  );
};
