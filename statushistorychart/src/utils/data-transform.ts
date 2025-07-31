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

import { LegendItem } from '@perses-dev/components';
import { applyValueMapping, TimeScale, TimeSeriesData } from '@perses-dev/core';
import { PanelData } from '@perses-dev/plugin-system';
import { useMemo } from 'react';
import { StatusHistoryChartOptions } from '../status-history-model';
import { StatusHistoryDataItem } from '../StatusHistoryChartBase';
import { FALLBACK_COLOR, getColorsForValues } from './get-color';
import { getCommonTimeScaleForQueries } from './get-timescale';

interface StatusHistoryDataModel {
  legendItems: LegendItem[];
  statusHistoryData: StatusHistoryDataItem[];
  xAxisCategories: number[];
  yAxisCategories: string[];
  timeScale?: TimeScale;
  colors: Array<{
    value: string | number;
    color: string;
  }>;
}

function generateCompleteTimestamps(timescale?: TimeScale): number[] {
  if (!timescale) {
    return [];
  }
  const { startMs, endMs, stepMs } = timescale;
  const timestamps: number[] = [];
  for (let time = startMs; time <= endMs; time += stepMs) {
    timestamps.push(time);
  }
  return timestamps;
}

export function useStatusHistoryDataModel(
  queryResults: Array<PanelData<TimeSeriesData>>,
  themeColors: string[],
  spec: StatusHistoryChartOptions
): StatusHistoryDataModel {
  return useMemo(() => {
    if (!queryResults || queryResults.length === 0) {
      return {
        legendItems: [],
        statusHistoryData: [],
        xAxisCategories: [],
        yAxisCategories: [],
        colors: [],
      };
    }

    const allSeries = queryResults.reduce<TimeSeriesData['series']>((acc, { data }) => {
      if (data && data.series) {
        acc.push(...data.series);
      }
      return acc;
    }, []);

    if (spec.sorting) {
      allSeries.sort((a, b) => {
        const nameA = a.formattedName || '';
        const nameB = b.formattedName || '';
        if (spec.sorting === 'asc') {
          return nameA.localeCompare(nameA);
        } else {
          return nameB.localeCompare(nameB);
        }
      });
    }

    const timeScale = getCommonTimeScaleForQueries(queryResults);
    const statusHistoryData: StatusHistoryDataItem[] = [];
    const yAxisCategories: string[] = [];
    const legendSet = new Set<number>();
    const hasValueMappings = spec.mappings?.length;

    const xAxisCategories = generateCompleteTimestamps(timeScale);

    allSeries.forEach((item) => {
      const instance = item.formattedName || '';
      yAxisCategories.push(instance);
      const yIndex = yAxisCategories.length - 1;
      item.values.forEach(([time, value]) => {
        const itemIndexOnXaxis = xAxisCategories.findIndex((v) => v === time);
        if (value !== null && itemIndexOnXaxis !== -1) {
          let itemLabel: string | number = value;
          if (hasValueMappings) {
            const mappedValue = applyValueMapping(value, spec.mappings);
            itemLabel = mappedValue.value;
          }
          legendSet.add(value);
          statusHistoryData.push({
            value: [itemIndexOnXaxis, yIndex, value],
            label: String(itemLabel),
          });
        }
      });
    });

    const uniqueValues = Array.from(legendSet);
    const colorsForValues = getColorsForValues(uniqueValues, themeColors);

    // get colors from theme and generate colors if not provided
    const colors = uniqueValues.map((value, index) => {
      let valueColor: string = colorsForValues[index] ?? FALLBACK_COLOR;

      if (hasValueMappings) {
        const mappedValue = applyValueMapping(value, spec.mappings);
        valueColor = mappedValue.color ?? valueColor;
      }

      return {
        value,
        color: valueColor,
      };
    });

    const legendItems: LegendItem[] = uniqueValues.map((value, idx) => {
      let label = String(value);

      if (hasValueMappings) {
        const mappedValue = applyValueMapping(value, spec.mappings);
        label = String(mappedValue.value);
      }

      const color = colors.find((i) => i.value === value)?.color || FALLBACK_COLOR;

      return {
        id: `${idx}-${value}`,
        label,
        color,
      };
    });

    return {
      xAxisCategories,
      yAxisCategories,
      legendItems,
      statusHistoryData,
      timeScale,
      colors,
    };
  }, [queryResults, themeColors, spec]);
}
