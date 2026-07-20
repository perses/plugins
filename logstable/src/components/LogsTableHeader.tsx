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

import React from 'react';
import { Box, TableSortLabel, useTheme } from '@mui/material';
import { ResolvedColumn } from './column-resolution';
import { SortState } from './logs-table-sorting';

const DEFAULT_MIN_WIDTHS: Record<string, number> = { timestamp: 160, line: 150, label: 80 };

interface LogsTableHeaderProps {
  resolvedColumns: ResolvedColumn[];
  gridTemplateColumns: string;
  isExpandable: boolean;
  actionCount: number;
  sortState: SortState | null;
  onSortClick: (column: ResolvedColumn) => void;
}

export const LogsTableHeader: React.FC<LogsTableHeaderProps> = ({
  resolvedColumns,
  gridTemplateColumns,
  isExpandable,
  actionCount,
  sortState,
  onSortClick,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        alignItems: 'center',
        padding: '4px 8px',
        gap: '12px',
        backgroundColor: theme.palette.background.paper,
        borderLeft: '4px solid transparent',
        borderBottom: `1px solid ${theme.palette.divider}`,
        position: 'sticky',
        top: 0,
        zIndex: 1,
        width: 'max-content',
        minWidth: '100%',
        fontSize: '12px',
        fontWeight: 'bold',
        flexShrink: 0,
      }}
    >
      {isExpandable && <Box sx={{ width: '16px' }} />}
      {resolvedColumns.map((column) => {
        const isActive = sortState?.columnName === column.name;
        const direction = isActive ? sortState!.direction : 'asc';
        const minWidth = column.width ?? DEFAULT_MIN_WIDTHS[column.type] ?? 80;

        if (column.enableSorting) {
          return (
            <Box key={column.name} sx={{ minWidth }}>
              <TableSortLabel
                active={isActive}
                direction={direction}
                onClick={() => onSortClick(column)}
                sx={{ fontSize: '12px', fontWeight: 'bold' }}
              >
                {column.header}
              </TableSortLabel>
            </Box>
          );
        }

        return (
          <Box key={column.name} sx={{ fontSize: '12px', fontWeight: 'bold', minWidth }}>
            {column.header}
          </Box>
        );
      })}
      {/* Placeholder for row actions, the copy action always takes 36px */}
      <Box sx={{ minWidth: 36 + actionCount * 30 }} />
    </Box>
  );
};
