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
import { Box, Menu, MenuItem, Divider } from '@mui/material';
import { ReactElement, useState, useMemo } from 'react';
import { ProfileData } from '@perses-dev/core';
import { useChartsTheme, EChart, MouseEventsParameters } from '@perses-dev/components';
import { EChartsCoreOption } from 'echarts/core';
import { heightOfJson, recursionJson } from '../utils/data-transform';
import { generateTooltip } from '../utils/tooltip';

const ITEM_GAP = 2; // vertical gap between flame chart levels (lines)
const TOP_SHIFT = 10; // margin from the top of the flame chart container
const RIGTH_SHIFT = 40; // margin from the rigth of the flame chart container

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
  const chartsTheme = useChartsTheme();
  const [palette, setPalette] = useState<'package-name' | 'value'>('package-name');
  const [menuPosition, setMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [menuTitle, setMenuTitle] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined); // id of the selected item
  const [isCopied, setIsCopied] = useState(false);

  const handleItemClick = (params: MouseEventsParameters<unknown>): void => {
    const data: Sample = params.data;
    const functionName = 6;
    setMenuTitle(data.value[functionName].toString());
    setSelectedId(data.name);

    // To ensure that the cursor is positioned inside the menu when it opens,
    // we adjust the click event coordinates as follows:
    if (params.event.event) {
      const mouseEvent = params.event.event as MouseEvent;
      setMenuPosition({
        mouseX: mouseEvent.clientX - 2,
        mouseY: mouseEvent.clientY - 4,
      });
    }
  };

  const handleFocusBlock = (): void => {
    // focus block
    handleClose();
  };

  const handleCopyFunctionName = (): void => {
    if ((selectedId || selectedId === 0) && menuTitle) {
      navigator.clipboard.writeText(menuTitle);
    }
    setIsCopied(true);
  };

  const handleResetGraph = (): void => {
    // reset flame graph
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
        x: (start?.[0] ?? RIGTH_SHIFT) - RIGTH_SHIFT,
        y: (start?.[1] ?? 0) - (height ?? 0) / 2 + TOP_SHIFT,
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
          fontFamily: 'Verdana',
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

    const levelOfOriginalJson = heightOfJson(data.profile.stackTrace);

    const option = {
      title: [
        {
          show: false,
        },
      ],
      tooltip: {
        formatter: (params: Sample): string => generateTooltip(params, data.metadata?.units),
      },
      xAxis: {
        show: false,
        max: data.profile.stackTrace.total, // todo: remove some space on the right
      },
      yAxis: {
        show: false,
        max: levelOfOriginalJson,
        inverse: true, // Reverse Y axis
      },
      axisLabel: {
        overflow: 'truncate',
        width: width / 3,
      },
      series: [
        {
          type: 'custom',
          renderItem,
          encode: {
            x: [0, 1, 2],
            y: 0,
          },
          data: recursionJson(palette, data.metadata, data.profile.stackTrace),
        },
      ],
    };

    return option;
  }, [data, chartsTheme, width, palette]);

  return (
    <Box
      style={{
        width: width,
        height: height,
      }}
    >
      <EChart
        sx={{
          width: '100%',
          height: '100%',
          padding: '5px',
        }}
        option={option} // even data is in this prop
        theme={chartsTheme.echartsTheme}
        onEvents={{
          click: handleItemClick,
          dblclick: handleItemClick,
        }}
      />
      <Menu
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#3b4252',
            color: 'white',
            padding: '5px',
            paddingBottom: '0px',
          },
          '& .MuiMenuItem-root': {
            '&:hover': {
              backgroundColor: '#4c566a',
            },
            '&.Mui-selected': {
              backgroundColor: '#3b4252',
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
        <Divider sx={{ backgroundColor: '#4c566a', height: '2px' }} />
        <MenuItem onClick={handleFocusBlock}>Focus block</MenuItem>
        <MenuItem onClick={handleCopyFunctionName} disabled={isCopied}>
          {isCopied ? 'Copied' : 'Copy function name'}
        </MenuItem>
        <MenuItem onClick={handleResetGraph}>Reset graph</MenuItem>
      </Menu>
    </Box>
  );
}
