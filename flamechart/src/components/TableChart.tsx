// Copyright 2025 The Perses Authors
// Licensed under the Apache License |  Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing |  software
// distributed under the License is distributed on an "AS IS" BASIS |
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND |  either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ReactElement, useMemo, useState } from 'react';
import { Stack, useTheme, Link } from '@mui/material';
import { ProfileData } from '@perses-dev/core';
import { Table, TableColumnConfig } from '@perses-dev/components';
import { SortingState } from '@tanstack/react-table';
import { tableRecursionJson } from '../utils/data-transform';
import { TableChartSample } from '../utils/data-model';
import { formatItemValue } from '../utils/format';
import { SearchBar } from './SearchBar';

const LARGE_PANEL_TRESHOLD = 600; // heigth treshold to switch to large panel mode
const PADDING_TOP = 20;
const SCROLL_BAR_WIDTH = 15;
const SEARCH_BAR_HEIGHT = 50;

export interface TableChartProps {
  width: number;
  height: number;
  data: ProfileData;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
}

export function TableChart(props: TableChartProps): ReactElement {
  const { width, height, data, searchValue, onSearchValueChange } = props;

  const theme = useTheme();

  const availableHeight = height - 10;
  const availableWidth = width - 10;

  const tableData: TableChartSample[] = useMemo(() => {
    return tableRecursionJson(data.profile.stackTrace, searchValue);
  }, [data, searchValue]);

  const columns: Array<TableColumnConfig<unknown>> = useMemo(() => {
    const unit = data.metadata?.units || '';

    const columnSettings: Array<TableColumnConfig<unknown>> = [
      {
        accessorKey: 'name',
        header: 'Name',
        headerDescription: 'Function name',
        align: 'left',
        enableSorting: true,
        width: 0.5 * availableWidth,
        cell: (ctx) => {
          const cellValue = ctx.getValue();
          return (
            <Link
              href="#"
              underline="hover"
              onClick={(e) => {
                e.preventDefault();
                const currentSample = ctx.row.original as TableChartSample;
                onSearchValueChange(currentSample.name);
              }}
            >
              {cellValue}
            </Link>
          );
        },
        cellDescription: () => '',
      },
      {
        accessorKey: 'self',
        header: 'Self',
        headerDescription: 'Function self samples',
        align: 'right',
        enableSorting: true,
        width: 0.25 * availableWidth - SCROLL_BAR_WIDTH,
        cell: (ctx) => {
          const cellValue = ctx.getValue();
          return formatItemValue(unit, cellValue);
        },
      },
      {
        accessorKey: 'total',
        header: 'Total',
        headerDescription: 'Function total samples',
        align: 'right',
        enableSorting: true,
        width: 0.25 * availableWidth,
        cell: (ctx) => {
          const cellValue = ctx.getValue();
          return formatItemValue(unit, cellValue);
        },
      },
    ];

    return columnSettings;
  }, [data.metadata?.units, availableWidth, onSearchValueChange]);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'total', desc: true }]);

  return (
    <Stack
      width={availableWidth}
      height={availableHeight}
      gap={1}
      sx={{
        paddingTop: `${PADDING_TOP}px`,
        '& .MuiTable-root': {
          borderCollapse: 'collapse',
        },
        '& .MuiTableCell-root': {
          borderBottom: `1px solid ${theme.palette.divider}`,
          borderRight: `1px solid ${theme.palette.divider}`,
          '&:last-child': {
            borderRight: 'none',
          },
        },
      }}
    >
      <SearchBar searchValue={searchValue} width={availableWidth} onSearchValueChange={onSearchValueChange} />
      <Table
        data={tableData}
        columns={columns}
        height={availableHeight - PADDING_TOP - SEARCH_BAR_HEIGHT}
        width={availableWidth}
        density={availableHeight < LARGE_PANEL_TRESHOLD ? 'compact' : 'standard'}
        defaultColumnWidth="auto"
        defaultColumnHeight="auto"
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </Stack>
  );
}
