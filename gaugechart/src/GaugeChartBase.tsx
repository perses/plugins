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

import { EChart, useChartsTheme } from '@perses-dev/components';
import { formatValue, useDeepMemo, FormatOptions } from '@perses-dev/core';
import { use, EChartsCoreOption } from 'echarts/core';
import { GaugeChart as EChartsGaugeChart, GaugeSeriesOption } from 'echarts/charts';
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ReactElement } from 'react';

use([EChartsGaugeChart, GridComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

// adjusts when to show pointer icon
const GAUGE_SMALL_BREAKPOINT = 170;

export type GaugeChartValue = number | null | undefined;

export type GaugeSeries = {
  value: GaugeChartValue;
  label: string;
};

export interface GaugeChartBaseProps {
  width: number;
  height: number;
  data: GaugeSeries;
  format: FormatOptions;
  axisLine: GaugeSeriesOption['axisLine'];
  max?: number;
  valueFontSize: string;
  progressWidth: number;
  titleFontSize: number;
}

export function GaugeChartBase(props: GaugeChartBaseProps): ReactElement {
  const { width, height, data, format, axisLine, max, valueFontSize, progressWidth, titleFontSize } = props;
  const chartsTheme = useChartsTheme();

  // useDeepMemo ensures value size util does not rerun everytime you hover on the chart
  const option: EChartsCoreOption = useDeepMemo(() => {
    if (data.value === undefined) return chartsTheme.noDataOption;

    // Base configuration shared by both series (= progress & scale)
    const baseGaugeConfig = {
      type: 'gauge' as const,
      center: ['50%', '65%'] as [string, string],
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: max,
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
      axisLabel: {
        show: false,
      },
      data: [
        {
          value: data.value,
        },
      ],
    };

    return {
      title: {
        show: false,
      },
      tooltip: {
        show: false,
      },
      series: [
        // Inner gauge (progress)
        {
          ...baseGaugeConfig,
          radius: '90%',
          silent: true,
          progress: {
            show: true,
            width: progressWidth,
            itemStyle: {
              color: 'auto',
            },
          },
          axisLine: {
            lineStyle: {
              color: [[1, 'rgba(127,127,127,0.35)']], // TODO (sjcobb): use future chart theme colors
              width: progressWidth,
            },
          },
          pointer: {
            show: false,
          },
          anchor: {
            show: false,
          },
          title: {
            show: false,
          },
          detail: {
            show: false,
          },
        },
        // Outer gauge (scale & display)
        {
          ...baseGaugeConfig,
          radius: '100%',
          pointer: {
            show: true,
            // pointer hidden for small panels, path taken from ex: https://echarts.apache.org/examples/en/editor.html?c=gauge-grade
            icon: width > GAUGE_SMALL_BREAKPOINT ? 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z' : 'none',
            length: 10,
            width: 5,
            offsetCenter: [0, '-49%'],
            itemStyle: {
              color: 'auto',
            },
          },
          axisLine: axisLine,
          // `detail` is the text displayed in the middle
          detail: {
            show: true,
            width: '60%',
            borderRadius: 8,
            offsetCenter: [0, '-9%'],
            color: 'inherit', // allows value color to match active threshold color
            fontSize: valueFontSize,
            formatter:
              data.value === null
                ? // We use a different function when we *know* the value is null
                  // at this level because the `formatter` function argument is `NaN`
                  // when the value is `null`, making it difficult to differentiate
                  // `null` from a true `NaN` case.
                  (): string => 'null'
                : (value: number): string | undefined => {
                    return formatValue(value, format);
                  },
          },
          data: [
            {
              value: data.value,
              name: data.label,
              // TODO: new UX for series names, create separate React component or reuse ListLegendItem
              // https://echarts.apache.org/en/option.html#series-gauge.data.title
              title: {
                show: true,
                color: chartsTheme.echartsTheme.textStyle?.color ?? 'inherit', // series name font color
                offsetCenter: [0, '55%'],
                overflow: 'truncate',
                fontSize: titleFontSize,
                width: width * 0.8,
              },
            },
          ],
        },
      ],
    };
  }, [data, width, height, chartsTheme, format, axisLine, max, valueFontSize, progressWidth, titleFontSize]);

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
