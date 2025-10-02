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

import { Box, styled, IconButton, Typography } from '@mui/material';

export const LogRowContainer = styled(Box)<{ severityColor: string }>(({ severityColor }) => ({
  borderLeft: `4px solid ${severityColor}`,
  transition: 'all 0.2s ease',
  marginBottom: '4px',
  fontFamily: '"DejaVu Sans Mono", monospace',
}));

export const LogRowContent = styled(Box)<{ isExpandable: boolean; time: boolean }>(({ theme, isExpandable }) => ({
  display: 'grid',
  gridTemplateColumns: isExpandable ? '16px minmax(160px, max-content) 1fr' : 'minmax(160px, max-content) 1fr',
  alignItems: 'flex-start',
  padding: '4px 8px',
  cursor: isExpandable ? 'pointer' : 'default',
  gap: '12px',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const ExpandButton = styled(IconButton)<{ isExpanded: boolean }>(({ theme, isExpanded }) => ({
  padding: 0,
  width: '16px',
  height: '16px',
  color: theme.palette.text.secondary,
  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
  transition: 'transform 0.2s ease',
}));

export const LogText = styled(Typography)<{ wrap: boolean }>(({ wrap }) => ({
  fontSize: '12px',
  flex: 1,
  lineHeight: 1.4,
  textAlign: 'left',
  ...(wrap
    ? {
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        overflow: 'visible',
        textOverflow: 'unset',
      }
    : {
        wordBreak: 'normal',
        whiteSpace: 'nowrap',
      }),
}));
