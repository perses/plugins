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

// import { use } from 'echarts/core';
import {
  CustomSeriesRenderItem,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemReturn,
} from 'echarts';
import * as echarts from 'echarts';
// import { CanvasRenderer } from 'echarts/renderers';
import { Box } from '@mui/material';
import { ReactElement, useState } from 'react';
import { StackTrace, ProfileData } from '@perses-dev/core';
import { useChartsTheme, EChart } from '@perses-dev/components';

const ITEM_GAP = 2; // vertical gap between flame chart levels (lines)
const TOP_SHIFT = 10; // margin from the top of the flame chart container
const RIGTH_SHIFT = 40; // margin from the rigth of the flame chart container

export interface FlameChartProps {
  width: number;
  height: number;
  data: ProfileData;
}

interface Sample {
  name: number;
  // [level, start_val, end_val, name, total_percentage, self_percentage, shortName, self, total]
  value: Array<string | number>;
  itemStyle: {
    color: string;
  };
}

export function FlameChart(props: FlameChartProps): ReactElement {
  const { width, height, data } = props;
  const chartsTheme = useChartsTheme();
  const [scheme, setScheme] = useState(0); // 0 = by package name, 1 = by value

  const formatCount = (value: number): string => {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1) + ' Bil'; // Bil -> billion
    } else if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + ' Mil'; // Mil -> million
    } else if (value >= 1_000) {
      return (value / 1_000).toFixed(1) + ' K'; // K -> thousand
    } else {
      return value.toString();
    }
  };

  const formatByte = (value: number): string => {
    if (value >= 1_000_000_000_000) {
      return (value / 1_000_000_000_000).toFixed(1) + ' TB'; // T -> Tera
    } else if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1) + ' GB'; // G -> Giga
    } else if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + ' MB'; // M -> Mega
    } else if (value >= 1_000) {
      return (value / 1_000).toFixed(1) + ' KB'; // K -> Kilo
    } else {
      return value.toString() + ' B'; // B -> byte
    }
  };

  const formatTime = (value: number): string => {
    const nanosecondsInMillisecond = 1_000_000; // 1 ms = 1,000,000 ns
    const nanosecondsInSecond = 1_000_000_000; // 1 s = 1,000,000,000 ns
    const nanosecondsInMinute = 60 * nanosecondsInSecond; // 1 min = 60 s

    if (value >= nanosecondsInMinute) {
      const minutes = value / nanosecondsInMinute;
      return `${minutes.toFixed(2)} mins`;
    } else if (value >= nanosecondsInSecond) {
      const seconds = value / nanosecondsInSecond;
      return `${seconds.toFixed(2)} s`;
    } else if (value >= nanosecondsInMillisecond) {
      const milliseconds = value / nanosecondsInMillisecond;
      return `${milliseconds.toFixed(2)} ms`;
    } else {
      return `${value} ns`;
    }
  };

  // build the name of the corresponding flamechart item
  const getName = (item: StackTrace, rootVal: number): string => {
    return (item.total / rootVal) * 100 < 1 ? '' : item.name + ` (${getValueWithUnit(item.total)})`;
  };

  const getValueWithUnit = (value: number): string => {
    let valueWithUnit = '';
    switch (data.metadata?.units) {
      case 'count':
        valueWithUnit = formatCount(value);
        break;
      case 'samples':
        valueWithUnit = formatCount(value);
        break;
      case 'objects':
        valueWithUnit = `${formatCount(value)} objects`;
        break;
      case 'bytes':
        valueWithUnit = formatByte(value);
        break;
      case 'nanoseconds':
        valueWithUnit = formatTime(value);
        break;
      default:
        valueWithUnit = `${value} ${data.metadata?.units}`;
        break;
    }
    return valueWithUnit;
  };

  // todo: modify this first
  const handleItemClick = (params: any): void => {
    console.log('id:', params.data.name);
    // const dataIndex = params.dataIndex;
    // if (dataIndex !== undefined) {
    //   const sample = option.series[0].data[dataIndex] as Sample;
    //   console.log('id:', sample.name);
    //   const id = Number(sample.name);
    //   data.profile.stackTrace = filterJson(data.profile.stackTrace, id);
    // }
  };

  // color scheme to display flame chart by total value (12 colors)
  const valueColorTypes: string[] = [
    '#dee2e6',
    '#d95850',
    '#b5c334',
    '#ffb248',
    '#f2d643',
    '#fcce10',
    '#eb8146',
    '#ebdba4',
    '#8fd3e8',
    '#8fd3e8',
    '#59c0a3',
    '#1bca93',
  ];

  // color scheme to display flame chart by package name (12 colors)
  const packageNameColorTypes = {
    lessThanOne: '#dee2e6',
    notFound: '#8982c9',
    lib: '#68b7cf',
    http: '#5095ce',
    connectrpc: '#ff6eb4',
    golang: '#f4d699',
    net: '#e0ad6c',
    sync: '#df8b53',
    other: '#d95850',
    github: '#f29191',
    runtime: '#59c0a3',
    total: '#4e92f9',
  };

  const getColorType = (name: string, value: number): string => {
    if (scheme === 0) {
      if (value < 1) {
        return packageNameColorTypes['lessThanOne'];
      }

      const splitedName = name.split('.')[0];
      if ((splitedName ?? '') in packageNameColorTypes) {
        return packageNameColorTypes[splitedName as keyof typeof packageNameColorTypes];
      } else if (splitedName?.includes('net')) {
        return packageNameColorTypes['net'];
      } else if (splitedName?.includes('lib')) {
        return packageNameColorTypes['lib'];
      } else if (splitedName?.includes('http')) {
        return packageNameColorTypes['http'];
      } else {
        return packageNameColorTypes['notFound'];
      }
    } else {
      return (value < 1 ? valueColorTypes[0] : valueColorTypes[Math.floor(value / 10) + 1]) || '#393d47';
    }
  };

  const filterJson = (json: StackTrace, id?: number): StackTrace => {
    if (id === null) {
      return json;
    }

    const recur = (item: StackTrace, id?: number): StackTrace | undefined => {
      if (item.id === id) {
        return item;
      }

      for (const child of item.children || []) {
        const temp = recur(child, id);
        if (temp) {
          item.children = [temp];

          // change the parents' values (todo : verify this)
          item.start = temp.start;
          item.end = temp.end;
          // item.self = temp.self;
          // item.total = temp.total;

          return item;
        }
      }
    };

    return recur(json, id) || json;
  };

  const recursionJson = (jsonObj: StackTrace, id?: number): Sample[] => {
    //console.log('data in perses : ', jsonObj);
    const data: Sample[] = [];
    const filteredJson = filterJson(structuredClone(jsonObj), id);

    const rootVal = filteredJson.total; // total samples of root node

    const recur = (item: StackTrace): void => {
      const temp = {
        name: item.id,
        // [level, start_val, end_val, name, total_percentage, self_percentage, shortName, self, total]
        value: [
          item.level,
          item.start,
          item.end,
          getName(item, rootVal),
          (item.total / rootVal) * 100,
          (item.self / rootVal) * 100,
          item.name,
          item.self,
          item.total,
        ],
        itemStyle: {
          color: getColorType(item.name, (item.total / rootVal) * 100),
        },
      };
      data.push(temp);

      for (const child of item.children || []) {
        recur(child);
      }
    };

    recur(filteredJson);
    console.log('data in perses :', data);
    return data;
  };

  const heightOfJson = (json: StackTrace): number => {
    const recur = (item: StackTrace): number => {
      if ((item.children || []).length === 0) {
        return item.level;
      }

      let maxLevel = item.level;
      for (const child of item.children!) {
        const tempLevel = recur(child);
        maxLevel = Math.max(maxLevel, tempLevel);
      }
      return maxLevel;
    };

    return recur(json);
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

  const levelOfOriginalJson = heightOfJson(data.profile.stackTrace);

  const option = {
    title: [
      {
        show: false,
      },
    ],
    tooltip: {
      formatter: (params: Sample): string => {
        return `${params.value[6]}<br/><br/>
        Total: ${getValueWithUnit(Number(params.value[8]))} (${Number(params.value[4]).toFixed(2)}%)<br/>
        Self: ${getValueWithUnit(Number(params.value[7]))} (${Number(params.value[5]).toFixed(2)}%)<br/>
        Samples: ${echarts.format.addCommas(Number(params.value[8]))}`;
      },
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
        data: recursionJson(data.profile.stackTrace),
      },
    ],
  };

  return (
    <Box
      style={{
        width: '100%',
        height: '100%',
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
        }}
      />
    </Box>
  );
}
