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

import { LegendItem, ModeOption, SortOption, TableColumnConfig } from '@perses-dev/components';
import { FormatOptions, formatValue } from '@perses-dev/core';
import { format } from 'echarts';
import { comparisonLegends, ComparisonValues } from '@perses-dev/plugin-system';
import { PieChartData } from './PieChartBase';
import { DEFAULT_SORT } from './pie-chart-model';

export function sortSeriesData<T extends PieChartData>(data: T[], sortOrder: SortOption = DEFAULT_SORT): T[] {
  return data.sort((a, b) => {
    // Handle null values - push them to the end regardless of sort order
    if (a.value === null && b.value === null) return 0;
    if (a.value === null) return 1;
    if (b.value === null) return -1;

    // Sort by value
    const diff = (a.value ?? 0) - (b.value ?? 0);
    return sortOrder === 'asc' ? diff : -diff;
  });
}

type formatterProps = { name: string; value: number | unknown[] | object; percent: number };
export const getTooltipFormatter = (formatOptions?: FormatOptions): ((props: formatterProps) => string) => {
  const relativeFormatOptions = { unit: 'percent', decimalPlaces: formatOptions?.decimalPlaces } as const;
  return ({ name, value, percent }: formatterProps): string => {
    if (typeof value === 'number') {
      return `${format.encodeHTML(name)}: ${formatValue(value, formatOptions)} (${formatValue(percent, relativeFormatOptions)})`;
    }
    return `${format.encodeHTML(name)}: ${format.encodeHTML(value.toString())}`;
  };
};
export const getLabelFormatter = (
  mode?: ModeOption,
  formatOptions?: FormatOptions
): ((props: formatterProps) => string) => {
  if (mode === 'percentage') {
    return percentageLabelFormatter(formatOptions);
  }
  return labelFormatter(formatOptions);
};

const labelFormatter = (formatOptions?: FormatOptions) => {
  return ({ name, value }: formatterProps): string => {
    if (typeof value === 'number') {
      return `${name}:\n${formatValue(value, formatOptions)}`;
    }
    return `${name}:\n${format.encodeHTML(value.toString())}`;
  };
};

const percentageLabelFormatter = (formatOptions?: FormatOptions) => {
  const relativeFormatOptions = { unit: 'percent', decimalPlaces: formatOptions?.decimalPlaces } as const;
  return ({ name, percent }: formatterProps): string => {
    return `${name}:\n${formatValue(percent, relativeFormatOptions)}`;
  };
};

export interface PieChartLegendMapper {
  mapToLegendItems: (pieChartData: Array<Required<PieChartData>>, selectedValues?: ComparisonValues[]) => LegendItem[];
  mapToLegendColumns: (
    selectedValues?: ComparisonValues[],
    formatOptions?: FormatOptions
  ) => Array<TableColumnConfig<LegendItem>>;
}

export class PieChartListLegendMapper implements PieChartLegendMapper {
  mapToLegendItems(pieChartData: Array<Required<PieChartData>>): LegendItem[] {
    return pieChartData.map(({ id, name, itemStyle }) => ({ id: id, label: name, color: itemStyle.color, data: {} }));
  }
  mapToLegendColumns(): Array<TableColumnConfig<LegendItem>> {
    return [];
  }
}

export class PieChartTableLegendMapper implements PieChartLegendMapper {
  mapToLegendItems(pieChartData: Array<Required<PieChartData>>, selectedValues?: ComparisonValues[]): LegendItem[] {
    const relativePieChartData = calculatePercentages(pieChartData);
    const absoluteValueSelected = selectedValues?.includes('abs');
    const relativeValueSelected = selectedValues?.includes('relative');
    return pieChartData.map(({ id, name, itemStyle, value }) => {
      const data: { [k in ComparisonValues]?: number } = {};
      if (absoluteValueSelected && typeof value === 'number') {
        data['abs'] = value;
      }
      if (relativeValueSelected) {
        const itemPercentageValue = relativePieChartData.find((rpd) => rpd.id === id)?.value;
        if (typeof itemPercentageValue === 'number') {
          data['relative'] = itemPercentageValue;
        }
      }
      return {
        id: id,
        label: name,
        color: itemStyle.color,
        data: data,
      };
    });
  }

  mapToLegendColumns(
    selectedValues?: ComparisonValues[],
    formatOptions?: FormatOptions
  ): Array<TableColumnConfig<LegendItem>> {
    const relativeFormatOptions = { unit: 'percent', decimalPlaces: formatOptions?.decimalPlaces } as const;
    return (
      selectedValues?.toSorted().map((v) => ({
        accessorKey: `data.${v}`,
        header: comparisonLegends[v]?.label || v,
        headerDescription: comparisonLegends[v]?.description,
        width: 90,
        align: 'right',
        cellDescription: true,
        enableSorting: true,
        cell: ({ getValue }): string => {
          const cellValue = getValue();
          return typeof cellValue === 'number' && formatOptions
            ? formatValue(cellValue, v === 'relative' ? relativeFormatOptions : formatOptions)
            : cellValue;
        },
      })) ?? []
    );
  }
}

function calculatePercentages<T extends PieChartData>(data: T[]): T[] {
  const sum = data.reduce((accumulator, { value }) => accumulator + (value ?? 0), 0);
  return data.map((seriesData) => {
    const percentage = ((seriesData.value ?? 0) / sum) * 100;
    return {
      ...seriesData,
      value: Number(percentage.toFixed(4)),
    };
  });
}
