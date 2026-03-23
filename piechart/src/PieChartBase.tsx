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

import { use } from 'echarts/core';
import { PieChart as EChartsPieChart } from 'echarts/charts';
import { DatasetComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, useTheme } from '@mui/material';
import { ReactElement } from 'react';
import { EChart, ModeOption, useChartsTheme } from '@perses-dev/components';
import { FormatOptions } from '@perses-dev/core';
import { getLabelFormatter, getTooltipFormatter } from './utils';

use([
  EChartsPieChart,
  GridComponent,
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
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
}

export function PieChartBase(props: PieChartBaseProps): ReactElement {
  const { width, height, data, mode, formatOptions, showLabels } = props;
  const chartsTheme = useChartsTheme();
  const muiTheme = useTheme();

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: getTooltipFormatter(formatOptions),
      appendTo: document.body,
      confine: false,
    },
    series: [
      {
        type: 'pie',
        radius: '90%',
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
          itemStyle: {
            shadowBlur: 10,
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
          width: '100%',
          height: '100%',
        }}
        option={option}
        theme={chartsTheme.echartsTheme}
      />
    </Box>
  );
}
