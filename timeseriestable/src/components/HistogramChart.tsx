import { ReactElement, useMemo } from 'react';
import { FormatOptions } from '@perses-dev/core';
import { EChart, ModeOption, useChartsTheme } from '@perses-dev/components';
import { use, EChartsCoreOption } from 'echarts/core';
import { Box } from '@mui/material';
import { BucketTuple } from '@perses-dev/prometheus/src/model';
import { CustomChart } from 'echarts/charts';
import { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from 'echarts';

use([CustomChart]);

export interface HistogramChartData {
  buckets: BucketTuple[];
}

export interface HistogramChartProps {
  width: number;
  height: number;
  data?: HistogramChartData;
  format?: FormatOptions;
  mode?: ModeOption;
  exponential?: boolean;
}

export function HistogramChart({ width, height, data }: HistogramChartProps): ReactElement | null {
  const chartsTheme = useChartsTheme();

  const transformedData = useMemo(() => {
    if (!data) return [];

    return data.buckets.map(([bucket, upperBound, lowerBound, count]) => {
      return {
        value: [parseFloat(upperBound), parseFloat(lowerBound), parseFloat(count), bucket],
        itemStyle: {
          color: chartsTheme.echartsTheme[0],
        },
      };
    });
  }, [chartsTheme.echartsTheme, data]);

  const option: EChartsCoreOption = useMemo(() => {
    if (!transformedData) return chartsTheme.noDataOption;

    return {
      title: {
        show: false,
      },
      tooltip: {},
      xAxis: {
        scale: false,
        max: Math.ceil(transformedData[transformedData.length - 1].value[1]),
      },
      yAxis: {},
      series: [
        {
          type: 'custom',
          renderItem: function (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) {
            const yValue = api.value(2);
            const start = api.coord([api.value(0), yValue]);
            const size = api.size?.([(api.value(1) as number) - (api.value(0) as number), yValue]) as number[];
            const style = api.style?.();

            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1],
                width: size[0],
                height: size[1],
              },
              style: style,
            };
          },
          label: {
            show: false,
          },
          dimensions: ['from', 'to'],
          encode: {
            x: [0, 1],
            y: 2,
            tooltip: [0, 1],
            itemName: 2,
          },
          data: transformedData,
        },
      ],
    };
  }, [chartsTheme.noDataOption, transformedData]);

  return (
    <Box
      style={{
        width: width,
        height: height,
      }}
      sx={{ overflow: 'auto' }}
    >
      <EChart
        sx={{
          minHeight: height,
        }}
        option={option}
        theme={chartsTheme.echartsTheme}
      />
    </Box>
  );
}
