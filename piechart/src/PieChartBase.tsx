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
import type { FormatOptions, ModeOption } from '@perses-dev/components';
import { EChart, useChartsTheme } from '@perses-dev/components';
import { PieChart as EChartsPieChart } from 'echarts/charts';
import { DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import type { ECharts } from 'echarts/core';
import { use as registerECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { ReactElement } from 'react';
import { useLayoutEffect, useMemo, useRef } from 'react';

import { DEFAULT_OUTER_RADIUS } from './pie-chart-model';
import { getLabelFormatter, getTooltipFormatter } from './utils';

registerECharts([
  EChartsPieChart,
  GridComponent,
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

const CHART_SX = { width: '100%', height: '100%' };
const CONTAINER_SX = { overflow: 'auto' };
const EMPHASIS_SHADOW_BLUR = 10;
const EMPHASIS_SCALE_SIZE = 5;
const PIE_INSET = EMPHASIS_SHADOW_BLUR + EMPHASIS_SCALE_SIZE;
export interface PieChartData {
  id?: string;
  name: string;
  value: number | null;
  itemStyle?: {
    color: string;
  };
}

export interface PieChartBaseProps {
  width: number;
  height: number;
  data: PieChartData[] | null;
  mode?: ModeOption;
  showLabels?: boolean;
  formatOptions?: FormatOptions;
  innerRadius?: number;
  outerRadius?: number;
}

export function PieChartBase(props: PieChartBaseProps): ReactElement {
  const {
    width,
    height,
    data,
    mode,
    formatOptions,
    showLabels,
    innerRadius,
    outerRadius = DEFAULT_OUTER_RADIUS,
  } = props;
  const chartsTheme = useChartsTheme();
  const muiTheme = useTheme();
  const chartRef = useRef<ECharts>();

  useLayoutEffect(() => {
    chartRef.current?.resize({ width, height });
  }, [height, width]);

  const containerStyle = useMemo(() => ({ width, height }), [width, height]);

  const option = useMemo(() => {
    // ECharts treats numeric radii as pixels, so convert persisted percentages at the rendering boundary.
    const radius = innerRadius === undefined ? `${outerRadius}%` : [`${innerRadius}%`, `${outerRadius}%`];
    return {
      tooltip: {
        trigger: 'item',
        formatter: getTooltipFormatter(formatOptions),
        appendTo: document.body,
        confine: false,
      },
      series: [
        {
          type: 'pie',
          radius,
          left: PIE_INSET,
          right: PIE_INSET,
          top: PIE_INSET,
          bottom: PIE_INSET,
          label: {
            show: Boolean(showLabels),
            position: 'inner',
            fontSize: 14,
            formatter: getLabelFormatter(mode, formatOptions),
            overflow: 'truncate',
            fontWeight: 'bold',
          },
          center: ['50%', '50%'],
          data: data,
          emphasis: {
            scaleSize: EMPHASIS_SCALE_SIZE,
            itemStyle: {
              shadowBlur: EMPHASIS_SHADOW_BLUR,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          itemStyle: {
            borderRadius: 5,
            borderColor: muiTheme.palette.background.default,
            borderWidth: 2,
          },
        },
      ],
    };
  }, [data, formatOptions, innerRadius, mode, muiTheme.palette.background.default, outerRadius, showLabels]);

  return (
    <Box style={containerStyle} sx={CONTAINER_SX}>
      <EChart _instance={chartRef} sx={CHART_SX} option={option} theme={chartsTheme.echartsTheme} />
    </Box>
  );
}
