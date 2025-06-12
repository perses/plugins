// Copyright 2025 The Perses Authors
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

import {
  CustomSeriesRenderItem,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemReturn,
} from 'echarts';
import { Box, Menu, MenuItem, Divider, useTheme } from '@mui/material';
import { ReactElement, useState, useMemo, MouseEvent } from 'react';
import { ProfileData } from '@perses-dev/core';
import { useChartsTheme, EChart, MouseEventsParameters } from '@perses-dev/components';
import { EChartsCoreOption } from 'echarts/core';
import { recursionJson } from '../utils/data-transform';
import { generateTooltip } from '../utils/tooltip';

const ITEM_GAP = 2; // vertical gap between flame chart items
const Y_MIN_SMALL = 6; // min value of y axis for small containers
const Y_MIN_LARGE = 20; // min value of y axis for large containers
const LARGE_CONTAINER_THRESHOLD = 600;

export interface FlameChartProps {
  width: number;
  height: number;
  data: ProfileData;
}

export interface Sample {
  name: number;
  value: [
    level: number,
    start_val: number,
    end_val: number,
    name: string,
    total_percentage: number,
    self_percentage: number,
    shortName: string,
    self: number,
    total: number,
  ];
  itemStyle: {
    color: string;
  };
}

export function FlameChart(props: FlameChartProps): ReactElement {
  const { width, height, data } = props;
  const theme = useTheme();
  const chartsTheme = useChartsTheme();
  const palette = 'package-name';
  const [menuPosition, setMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [menuTitle, setMenuTitle] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined); // id of the selected item
  const [isCopied, setIsCopied] = useState(false);
  const [seriesData, setSeriesData] = useState<Sample[]>(
    recursionJson(palette, data.metadata, data.profile.stackTrace)
  );
  const [isBlockFocused, setIsBlockFocused] = useState(false);

  const handleItemClick = (params: MouseEventsParameters<Sample>): void => {
    const data: Sample = params.data;
    const functionName = data.value[6];
    setMenuTitle(functionName);
    setSelectedId(data.name);

    // To ensure that the cursor is positioned inside the menu when it opens,
    // we adjust the click event coordinates as follows:
    if ('event' in params) {
      const mouseEvent = params.event as { event: MouseEvent };
      setMenuPosition({
        mouseX: mouseEvent.event.clientX - 2,
        mouseY: mouseEvent.event.clientY - 4,
      });
    }
  };

  const handleFocusBlock = (): void => {
    if (selectedId) {
      setSeriesData(recursionJson(palette, data.metadata, data.profile.stackTrace, selectedId));
      setIsBlockFocused(true);
    }
    handleClose();
  };

  const handleCopyFunctionName = (): void => {
    if ((selectedId || selectedId === 0) && menuTitle) {
      navigator.clipboard.writeText(menuTitle);
    }
    setIsCopied(true);
  };

  const handleResetGraph = (): void => {
    if (isBlockFocused) {
      setSeriesData(recursionJson(palette, data.metadata, data.profile.stackTrace));
      setIsBlockFocused(false);
    }
    handleClose();
  };

  const handleClose = (): void => {
    setMenuPosition(null);
    if (isCopied) setIsCopied(false);
  };

  const renderItem: CustomSeriesRenderItem = (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
    const level = api.value(0);
    const start = api.coord([api.value(1), level]);
    const end = api.coord([api.value(2), level]);
    const height = (((api.size && api.size([0, 1])) || [0, 20]) as number[])[1];
    const width = (end?.[0] ?? 0) - (start?.[0] ?? 0);

    return {
      type: 'rect',
      transition: ['shape'],
      shape: {
        x: start?.[0],
        y: (start?.[1] ?? 0) - (height ?? 0) / 2,
        width,
        height: (height ?? ITEM_GAP) - ITEM_GAP,
        r: 0,
      },
      style: {
        fill: api.visual('color'),
      },
      emphasis: {
        style: {
          stroke: '#000',
        },
      },
      textConfig: {
        position: 'insideLeft',
      },
      textContent: {
        style: {
          text: api.value(3),
          fill: '#000',
          width: width - 4,
          overflow: 'truncate',
          ellipsis: '..',
          truncateMinChar: 1,
        },
        emphasis: {
          style: {
            stroke: '#000',
            lineWidth: 0.5,
          },
        },
      },
    } as CustomSeriesRenderItemReturn;
  };

  // update seriesData with the latest data
  useMemo(() => {
    setSeriesData(recursionJson(palette, data.metadata, data.profile.stackTrace));
  }, [data, palette]);

  const option: EChartsCoreOption = useMemo(() => {
    if (data.profile.stackTrace === undefined) return chartsTheme.noDataOption;

    const maxDepth = Math.max(...seriesData.map((s) => s.value[0])); // maximum depth of the stack trace
    const yAxisMax = Math.max(height > LARGE_CONTAINER_THRESHOLD ? Y_MIN_LARGE : Y_MIN_SMALL, maxDepth);
    const totalStart = seriesData[0]?.value[1]; // start value of the total function
    const totalEnd = seriesData[0]?.value[2]; // end value of the total function
    const xAxisMin = totalStart;
    const xAxisMax = totalEnd;

    const option = {
      tooltip: {
        appendToBody: true,
        confine: true,
        formatter: (params: Sample): string => generateTooltip(params, data.metadata?.units),
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.background.paper,
        textStyle: {
          color: theme.palette.text.primary,
        },
      },
      xAxis: {
        show: false,
        min: xAxisMin,
        max: xAxisMax,
        axisLabel: {
          show: false,
        },
      },
      yAxis: {
        show: false,
        max: yAxisMax,
        inverse: true, // Reverse Y axis
        axisLabel: {
          show: false,
        },
      },
      axisLabel: {
        overflow: 'truncate',
        width: width / 3,
      },
      grid: {
        left: 5,
        right: 5,
        top: 20,
        bottom: 20,
      },
      series: [
        {
          type: 'custom',
          renderItem,
          encode: {
            x: [0, 1, 2],
            y: 0,
          },
          data: seriesData,
        },
      ],
    };

    return option;
  }, [data, chartsTheme, theme, width, seriesData, height]);

  // Use useMemo to memoize the flame chart component and prevent unnecessary re-renders.
  // This ensures the chart does not re-render when the onClick event updates state variables
  // like menuPosition or selectedId.
  const flameChart = useMemo(
    () => (
      <EChart
        sx={{
          width: width,
          height: height,
        }}
        option={option} // even data is in this prop
        theme={chartsTheme.echartsTheme}
        onEvents={{
          click: handleItemClick as (params: MouseEventsParameters<unknown>) => void,
        }}
      />
    ),
    [chartsTheme.echartsTheme, height, option, width]
  );

  return (
    <Box
      style={{
        width: width,
        height: height,
      }}
    >
      {flameChart}
      <Menu
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            padding: '5px',
            paddingBottom: '0px',
          },
          '& .MuiMenuItem-root': {
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          },
        }}
        open={menuPosition !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition !== null ? { top: menuPosition.mouseY, left: menuPosition.mouseX } : undefined}
      >
        <Box
          sx={{
            paddingLeft: '16px',
            paddingBottom: '8px',
          }}
        >
          {menuTitle}
        </Box>
        <Divider sx={{ backgroundColor: theme.palette.divider }} />
        <MenuItem onClick={handleFocusBlock}>Focus block</MenuItem>
        <MenuItem onClick={handleCopyFunctionName} disabled={isCopied}>
          {isCopied ? 'Copied' : 'Copy function name'}
        </MenuItem>
        <MenuItem onClick={handleResetGraph}>Reset graph</MenuItem>
      </Menu>
    </Box>
  );
}
