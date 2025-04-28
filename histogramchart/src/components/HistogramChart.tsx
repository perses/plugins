import { ReactElement, useMemo } from 'react';
import { FormatOptions } from '@perses-dev/core';
import { EChart, getFormattedAxis, useChartsTheme } from '@perses-dev/components';
import { use, EChartsCoreOption } from 'echarts/core';
import { BucketTuple } from '@perses-dev/prometheus/src/model';
import { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from 'echarts';
import { CustomChart } from 'echarts/charts';

use([CustomChart]);

export interface HistogramChartData {
  buckets: BucketTuple[];
}

export interface HistogramChartProps {
  width: number;
  height: number;
  data: HistogramChartData;
  format?: FormatOptions;
  min?: number;
  max?: number;
  // TODO: exponential?: boolean;
}

export function HistogramChart({ width, height, data, format, min, max }: HistogramChartProps): ReactElement | null {
  const chartsTheme = useChartsTheme();

  const transformedData = useMemo(() => {
    return data.buckets.map(([bucket, upperBound, lowerBound, count]) => {
      return {
        value: [parseFloat(upperBound), parseFloat(lowerBound), parseFloat(count), bucket],
        itemStyle: {
          color: chartsTheme.echartsTheme[0],
        },
      };
    });
  }, [chartsTheme.echartsTheme, data]);

  const maxXAxis: number | undefined = useMemo(() => {
    if (max) {
      return max;
    }
    if (transformedData && transformedData[transformedData.length - 1]) {
      return Math.ceil(transformedData[transformedData.length - 1]?.value[1] ?? 1);
    }
    return undefined;
  }, [max, transformedData]);

  const option: EChartsCoreOption = useMemo(() => {
    if (!transformedData) return chartsTheme.noDataOption;

    return {
      title: {
        show: false,
      },
      tooltip: {},
      xAxis: {
        scale: false,
        min: min,
        max: maxXAxis,
      },
      yAxis: getFormattedAxis({}, format),
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
  }, [chartsTheme.noDataOption, format, maxXAxis, min, transformedData]);

  return (
    <EChart
      sx={{
        width: width,
        height: height,
        padding: `${chartsTheme.container.padding.default}px`,
      }}
      option={option}
      theme={chartsTheme.echartsTheme}
    />
  );
}
