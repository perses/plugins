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
import { ColumnSettings } from '../utils/table-model';
import { formatItemValue } from '../utils/format';

const LARGE_SCREEN_TRESHOLD = 600; // heigth treshold to switch to large screen mode
const PADDING_TOP = 20; // padding top for the table
const SCROLL_BAR_WIDTH = 15;

export interface TableChartProps {
  width: number;
  height: number;
  data: ProfileData;
  tableFilters: number[];
  onTableFiltersChange: (filters: number[]) => void;
}

export function TableChart(props: TableChartProps): ReactElement {
  const { width, height, data, tableFilters, onTableFiltersChange } = props;

  const theme = useTheme();

  const availableHeight = height - 10;
  const availableWidth = width - 10;

  const tableData: TableChartSample[] = useMemo(() => {
    // when data changes, we need to set tableFilters to []
    const tempData = tableRecursionJson(data.profile.stackTrace);
    return tableFilters.length > 0 ? tempData.filter((item) => tableFilters.includes(item.id)) : tempData;
  }, [data, tableFilters]);

  const columns: Array<TableColumnConfig<unknown>> = useMemo(() => {
    const columns: Array<TableColumnConfig<unknown>> = [];

    const columnSettings: ColumnSettings[] = [
      {
        name: 'name',
        header: 'Name',
        headerDescription: 'Function name',
        align: 'left',
        enableSorting: true,
        width: (1 / 2) * availableWidth,
      },
      {
        name: 'self',
        header: 'Self',
        headerDescription: 'Function self samples',
        align: 'right',
        enableSorting: true,
        width: (1 / 4) * availableWidth - SCROLL_BAR_WIDTH,
      },
      {
        name: 'total',
        header: 'Total',
        headerDescription: 'Function total samples',
        align: 'right',
        enableSorting: true,
        width: (1 / 4) * availableWidth,
      },
    ];

    const generateCellContentConfig = (
      column: ColumnSettings,
      unit: string
    ): Pick<TableColumnConfig<unknown>, 'cellDescription' | 'cell'> => {
      return {
        cell: (ctx) => {
          const cellValue = ctx.getValue();
          // Add clickable link for name column
          if (column.name === 'name') {
            return (
              <Link
                href="#"
                underline="hover"
                onClick={(e) => {
                  e.preventDefault();
                  const currentSample = ctx.row.original as TableChartSample;
                  onTableFiltersChange([currentSample.id]);
                }}
              >
                {cellValue}
              </Link>
            );
          }

          return formatItemValue(unit, cellValue);
        },
        cellDescription: () => '',
      };
    };

    // Generate column config
    // If column do not have a definition, return a default column config.
    const generateColumnConfig = (
      name: string,
      columnSettings: ColumnSettings[],
      unit: string
    ): TableColumnConfig<unknown> => {
      for (const column of columnSettings) {
        if (column.name === name) {
          return {
            accessorKey: name,
            header: column.header ?? name,
            headerDescription: column.headerDescription,
            enableSorting: column.enableSorting,
            width: column.width,
            align: column.align,
            ...generateCellContentConfig(column, unit),
          };
        }
      }

      return {
        accessorKey: name,
        header: name,
      };
    };

    const unit = data.metadata?.units || '';

    const nameColumn = generateColumnConfig('name', columnSettings, unit);
    columns.push(nameColumn);

    const selfColumn = generateColumnConfig('self', columnSettings, unit);
    columns.push(selfColumn);

    const totalColumn = generateColumnConfig('total', columnSettings, unit);
    columns.push(totalColumn);

    return columns;
  }, [data.metadata?.units, availableWidth, onTableFiltersChange]);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'total', desc: true }]);

  return (
    <Stack
      width={availableWidth}
      height={availableHeight}
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
      <Table
        data={tableData}
        columns={columns}
        height={availableHeight - PADDING_TOP}
        width={availableWidth}
        density={availableHeight < LARGE_SCREEN_TRESHOLD ? 'compact' : 'standard'}
        defaultColumnWidth="auto"
        defaultColumnHeight="auto"
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </Stack>
  );
}
