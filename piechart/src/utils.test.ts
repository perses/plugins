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

import { CellContext, ColumnDefTemplate } from '@tanstack/react-table';
import { PieChartData } from './PieChartBase';
import { PieChartListLegendMapper, PieChartTableLegendMapper, sortSeriesData } from './utils';

const MOCK_DATA: Array<Required<PieChartData>> = [
  {
    id: '1',
    name: 'Label 1',
    value: 3,
    itemStyle: {
      color: '#ff0000',
    },
  },
  {
    id: '2',
    name: 'Label 2',
    value: 2,
    itemStyle: {
      color: '#00ffea',
    },
  },
  {
    id: '3',
    name: 'Label 3',
    value: 0,
    itemStyle: {
      color: '#0000ff',
    },
  },
  {
    id: '4',
    name: 'Label 4',
    value: 5,
    itemStyle: {
      color: '#ff00ff',
    },
  },
  {
    id: '5',
    name: 'Label 5',
    value: null,
    itemStyle: {
      color: '#00ff00',
    },
  },
];

describe('PieChartTableLegendMapper', () => {
  const mapper = new PieChartTableLegendMapper();
  it.each([
    { selectedValues: [], expectedData: [{}, {}, {}, {}, {}] },
    {
      selectedValues: ['relative'],
      expectedData: [{ relative: 30 }, { relative: 20 }, { relative: 0 }, { relative: 50 }, { relative: 0 }],
    },
    {
      selectedValues: ['abs'],
      expectedData: [{ abs: 3 }, { abs: 2 }, { abs: 0 }, { abs: 5 }, {}],
    },
    {
      selectedValues: ['relative', 'abs'],
      expectedData: [
        { relative: 30, abs: 3 },
        { relative: 20, abs: 2 },
        { relative: 0, abs: 0 },
        { relative: 50, abs: 5 },
        { relative: 0 },
      ],
    },
  ])('maps to correct values for selected: $selectedValues', ({ selectedValues, expectedData }) => {
    const table = mapper.mapToLegendItems(MOCK_DATA, selectedValues as Array<'relative' | 'abs'>);
    expect(table).toEqual(
      [
        {
          color: '#ff0000',
          id: '1',
          label: 'Label 1',
        },
        {
          color: '#00ffea',
          id: '2',
          label: 'Label 2',
        },
        {
          color: '#0000ff',
          id: '3',
          label: 'Label 3',
        },
        {
          color: '#ff00ff',
          id: '4',
          label: 'Label 4',
        },
        {
          color: '#00ff00',
          id: '5',
          label: 'Label 5',
        },
      ].map((v, index) => ({ ...v, data: expectedData[index] }))
    );
  });

  it.each([
    {
      selectedValues: ['relative'],
      expectedColumns: [
        {
          accessorKey: `data.relative`,
          header: 'Relative',
          headerDescription: 'Relative value',
        },
      ],
      cellValue: 30,
      expectedDisplayValue: '30.00%',
      formatOptions: { decimalPlaces: 2, unit: 'bytes' } as const,
    },
    {
      selectedValues: ['abs'],
      expectedColumns: [
        {
          accessorKey: `data.abs`,
          header: 'Absolute',
          headerDescription: 'Absolute value',
        },
      ],
      cellValue: 30,
      expectedDisplayValue: '30.00 bytes',
      formatOptions: { decimalPlaces: 2, unit: 'bytes' } as const,
    },
  ])(
    'maps to columns for selected values: $selectedValues',
    ({ selectedValues, expectedColumns, cellValue, expectedDisplayValue, formatOptions }) => {
      const columns = mapper.mapToLegendColumns(selectedValues as Array<'relative' | 'abs'>, formatOptions);
      expect(columns).toEqual(expectedColumns.map((v) => expect.objectContaining(v)));
      expect(selectedValues.length).toEqual(columns.length);
      const cellFormatter: ColumnDefTemplate<CellContext<number, number>> = columns[0]?.cell as ColumnDefTemplate<
        CellContext<number, number>
      >;
      if (typeof cellFormatter === 'function') {
        const formattedValue = cellFormatter({
          getValue: () => cellValue,
        } as CellContext<number, number>);
        expect(formattedValue).toEqual(expectedDisplayValue);
      } else {
        throw new Error('Cell formatter is not defined');
      }
    }
  );
});

describe('PieChartListLegendMapper', () => {
  const mapper = new PieChartListLegendMapper();
  it('maps to LegendItems', () => {
    const list = mapper.mapToLegendItems(MOCK_DATA);
    expect(list).toEqual([
      {
        color: '#ff0000',
        id: '1',
        label: 'Label 1',
        data: {},
      },
      {
        color: '#00ffea',
        id: '2',
        label: 'Label 2',
        data: {},
      },
      {
        color: '#0000ff',
        id: '3',
        label: 'Label 3',
        data: {},
      },
      {
        color: '#ff00ff',
        id: '4',
        label: 'Label 4',
        data: {},
      },
      {
        color: '#00ff00',
        id: '5',
        label: 'Label 5',
        data: {},
      },
    ]);
  });
});

describe('sortSeriesData', () => {
  it('sorts in ascending order', () => {
    const sorted = sortSeriesData(MOCK_DATA, 'asc');
    expect(sorted).toEqual([
      expect.objectContaining({
        name: 'Label 3',
        value: 0,
      }),
      expect.objectContaining({
        name: 'Label 2',
        value: 2,
      }),
      expect.objectContaining({
        name: 'Label 1',
        value: 3,
      }),
      expect.objectContaining({
        name: 'Label 4',
        value: 5,
      }),
      expect.objectContaining({
        name: 'Label 5',
        value: null,
      }),
    ]);
  });

  it('sorts in descending order', () => {
    const sorted = sortSeriesData(MOCK_DATA, 'desc');
    expect(sorted).toEqual([
      expect.objectContaining({
        name: 'Label 4',
        value: 5,
      }),
      expect.objectContaining({
        name: 'Label 1',
        value: 3,
      }),
      expect.objectContaining({
        name: 'Label 2',
        value: 2,
      }),
      expect.objectContaining({
        name: 'Label 3',
        value: 0,
      }),
      expect.objectContaining({
        name: 'Label 5',
        value: null,
      }),
    ]);
  });
});
