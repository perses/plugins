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

import React from 'react';
import { Table, TableBody, TableRow, TableCell, useTheme, alpha } from '@mui/material';

interface LogLabelsTableProps {
  labels: Record<string, string>;
}

export const LogLabelsTable: React.FC<LogLabelsTableProps> = ({ labels }) => {
  const theme = useTheme();

  if (Object.keys(labels).length === 0) {
    return null;
  }

  return (
    <Table
      size="small"
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        '& .MuiTableCell-root': {
          border: 'none',
          padding: '6px 8px',
          fontSize: '12px',
        },
      }}
    >
      <TableBody>
        {Object.entries(labels).map(([key, value]) => (
          <TableRow
            key={key}
            sx={{
              '&:hover': {
                backgroundColor: alpha(theme.palette.action.hover, 0.04),
              },
            }}
          >
            <TableCell
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 500,
                width: '33%',
              }}
            >
              {key}
            </TableCell>
            <TableCell
              sx={{
                color: theme.palette.text.primary,
                wordBreak: 'break-all',
                width: '67%',
              }}
            >
              {value}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
