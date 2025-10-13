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
import { Box, useTheme } from '@mui/material';
import { Virtuoso } from 'react-virtuoso';
import { LogEntry } from '@perses-dev/core';
import { LogsTableOptions } from '../model';
import { LogRow } from './LogRow/LogRow';

interface VirtualizedLogsListProps {
  logs: LogEntry[];
  spec: LogsTableOptions;
  expandedRows: Set<number>;
  onToggleExpand: (index: number) => void;
}

export const VirtualizedLogsList: React.FC<VirtualizedLogsListProps> = ({
  logs,
  spec,
  expandedRows,
  onToggleExpand,
}) => {
  const theme = useTheme();

  const renderLogRow = (index: number) => {
    const log = logs[index];
    if (!log) return null;

    return (
      <LogRow
        isExpandable={spec.enableDetails}
        log={log}
        index={index}
        isExpanded={expandedRows.has(index)}
        onToggle={onToggleExpand}
        allowWrap={spec.allowWrap}
        showTime={spec.showTime}
      />
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        backgroundColor: theme.palette.background.default,
        overflow: 'hidden',
        boxShadow: theme.shadows[1],
      }}
    >
      <Virtuoso
        style={{ height: '100%' }}
        initialItemCount={spec.showAll ? logs.length : undefined}
        totalCount={logs.length}
        itemContent={renderLogRow}
      />
    </Box>
  );
};
