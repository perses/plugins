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
import { LogEntry } from '@perses-dev/core';
import { LogsTableOptions } from '../model';
import { EmptyLogsState } from './EmptyLogsState';
import { useExpandedRows } from './hooks/useExpandedRows';
import { VirtualizedLogsList } from './VirtualizedLogsList';

interface LogsListProps {
  logs: LogEntry[];
  spec: LogsTableOptions;
}

export const LogsList: React.FC<LogsListProps> = ({ logs, spec }) => {
  const { expandedRows, toggleExpand } = useExpandedRows();

  if (!logs.length) {
    return <EmptyLogsState />;
  }

  return <VirtualizedLogsList logs={logs} spec={spec} expandedRows={expandedRows} onToggleExpand={toggleExpand} />;
};
