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

import React, { memo, useCallback } from 'react';
import { Box, Collapse } from '@mui/material';
import ChevronRight from 'mdi-material-ui/ChevronRight';
import { LogEntry } from '../../../../model/loki-data-types';
import { useSeverityColor } from '../../hooks/useSeverity';
import { LogTimestamp } from './LogTimestamp';
import { LogRowContainer, LogRowContent, ExpandButton, LogText } from './LogsStyles';
import { LogLabelsTable } from './LogsLabelsTable';

interface LogRowProps {
  log?: LogEntry;
  index: number;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  isExpandable?: boolean;
  time?: boolean;
  wrap?: boolean;
}

export const LogRow: React.FC<LogRowProps> = memo(
  ({ log, isExpanded, index, onToggle, isExpandable = false, time = false, wrap = false }) => {
    const severityColor = useSeverityColor(log);

    const handleToggle = useCallback(() => {
      if (isExpandable) {
        onToggle(index);
      }
    }, [isExpandable, onToggle, index]);

    if (!log) {
      return null;
    }

    return (
      <LogRowContainer severityColor={severityColor}>
        <LogRowContent onClick={handleToggle} isExpandable={isExpandable} time={time}>
          {isExpandable && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '16px',
                justifyContent: 'center',
              }}
            >
              <ExpandButton size="small" isExpanded={isExpanded}>
                <ChevronRight sx={{ fontSize: '12px' }} />
              </ExpandButton>
            </Box>
          )}

          {time && <LogTimestamp timestamp={log.timestamp} />}

          <LogText variant="body2" wrap={wrap}>
            {log.line}
          </LogText>
        </LogRowContent>

        <Collapse in={isExpanded} timeout={200}>
          <Box
            sx={{
              padding: '8px',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: !time ? '1fr' : '8px minmax(160px, max-content) 1fr',
                gap: '12px',
              }}
            >
              {/* spacers */}
              {time && (
                <>
                  <Box />
                  <Box />
                </>
              )}
              <Box>
                <LogLabelsTable labels={log.labels} />
              </Box>
            </Box>
          </Box>
        </Collapse>
      </LogRowContainer>
    );
  }
);

LogRow.displayName = 'LogRow';
