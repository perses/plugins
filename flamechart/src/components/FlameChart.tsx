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
import { Stack, Box, Menu, MenuItem, Divider, useTheme } from '@mui/material';
import { ReactElement, useState, useMemo, MouseEvent } from 'react';
import { ProfileData } from '@perses-dev/core';
import { useChartsTheme, EChart, MouseEventsParameters } from '@perses-dev/components';
import RefreshIcon from 'mdi-material-ui/Refresh';
import EyeIcon from 'mdi-material-ui/EyeOutline';
import ContentCopyIcon from 'mdi-material-ui/ContentCopy';
import { EChartsCoreOption } from 'echarts/core';
import { buildSamples, findTotalSampleByName } from '../utils/data-transform';
import { generateTooltip } from '../utils/tooltip';
import { FlameChartSample as Sample } from '../utils/data-model';
import { CustomBreadcrumb } from './CustomBreadcrumb';

const ITEM_GAP = 2; // vertical gap between flame chart items
const Y_MIN_SMALL = 6; // min value of y axis for small containers
const Y_MIN_LARGE = 20; // min value of y axis for large containers
const LARGE_CONTAINER_THRESHOLD = 600;
const CONTAINER_PADDING = 10;
const BREADCRUMB_SPACE = 50;

export interface FlameChartProps {
  width: number;
  height: number;
  data: ProfileData;
  palette: 'package-name' | 'value';
  selectedId: number;
  searchValue: string;
  onSelectedIdChange: (newId: number) => void;
}

export function FlameChart(props: FlameChartProps): ReactElement {
  const { width, height, data, palette, selectedId, searchValue, onSelectedIdChange } = props;
  const theme = useTheme();
  const chartsTheme = useChartsTheme();
  const [menuPosition, setMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: number; name: string }>({ id: 0, name: '' });
  const [isCopied, setIsCopied] = useState(false);

  const seriesData = useMemo(
    () => buildSamples(palette, data.metadata, data.profile.stackTrace, searchValue, selectedId),
    [palette, data.metadata, data.profile.stackTrace, selectedId, searchValue]
  );

  const handleItemClick = (params: MouseEventsParameters<Sample>): void => {
    const data: Sample = params.data;
    const functionName = data.value[6];
    const functionId = data.name;
    setSelectedItem({ id: functionId, name: functionName });

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
    onSelectedIdChange(selectedItem.id);
    handleClose();
  };

  const handleCopyFunctionName = (): void => {
    if ((selectedId || selectedId === 0) && selectedItem.name) {
      navigator.clipboard.writeText(selectedItem.name);
    }
    setIsCopied(true);
  };

  const handleResetGraph = (): void => {
    if (selectedId) {
      onSelectedIdChange(0);
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

  const option: EChartsCoreOption = useMemo(() => {
    if (data.profile.stackTrace === undefined) return chartsTheme.noDataOption;

    const maxDepth = Math.max(...seriesData.map((s) => s.value[0])); // maximum depth of the stack trace
    const yAxisMax = Math.max(height > LARGE_CONTAINER_THRESHOLD ? Y_MIN_LARGE : Y_MIN_SMALL, maxDepth);
    const totalStart = seriesData[0]?.value[1]; // start value of the total function
    const totalEnd = seriesData[0]?.value[2]; // end value of the total function
    const xAxisMin = totalStart;
    const xAxisMax = totalEnd;

    // compute flame chart padding top and bottom
    const padding = (height / (yAxisMax - 1) - ITEM_GAP) / 2 + 1;

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
        top: padding + 5,
        bottom: padding,
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
          height: height - 2 * CONTAINER_PADDING - BREADCRUMB_SPACE,
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
    <Stack
      style={{
        width: width,
        height: height,
      }}
      alignItems="center"
    >
      <CustomBreadcrumb
        totalValue={seriesData[0]?.value[3] || ''} // name of the total function
        totalSample={seriesData[0]?.value[8] || 0} // total sample of the total function
        otherItemSample={findTotalSampleByName(seriesData, selectedId)} // total sample of the selected function
        onSelectedIdChange={onSelectedIdChange}
      />
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
          {selectedItem.name}
        </Box>
        <Divider sx={{ backgroundColor: theme.palette.divider }} />
        <MenuItem onClick={handleFocusBlock}>
          <EyeIcon fontSize="small" color="secondary" sx={{ marginRight: '10px' }} />
          Focus block
        </MenuItem>
        <MenuItem onClick={handleCopyFunctionName} disabled={isCopied}>
          <ContentCopyIcon fontSize="small" color="secondary" sx={{ marginRight: '10px' }} />
          {isCopied ? 'Copied' : 'Copy function name'}
        </MenuItem>
        <MenuItem onClick={handleResetGraph}>
          <RefreshIcon fontSize="small" color="secondary" sx={{ marginRight: '10px' }} />
          Reset graph
        </MenuItem>
      </Menu>
    </Stack>
  );
}
