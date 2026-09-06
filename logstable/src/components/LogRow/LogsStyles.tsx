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

import type { StyledComponent } from '@emotion/styled';
import type { BoxProps, IconButtonProps, TypographyProps } from '@mui/material';
import { Box, styled, IconButton, Typography } from '@mui/material';

type LogRowContainerProps = { severityColor?: string };

export const LogRowContainer: StyledComponent<BoxProps & LogRowContainerProps> = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'severityColor',
})<LogRowContainerProps>(({ severityColor }) => ({
  borderLeft: `4px solid ${severityColor}`,
  transition: 'all 0.2s ease',
  marginBottom: '4px',
  fontFamily: '"DejaVu Sans Mono", monospace',
  userSelect: 'text',
}));

type LogRowContentProps = {
  isExpandable: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  hasRowActions?: boolean;
};

export const LogRowContent: StyledComponent<BoxProps & LogRowContentProps> = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'isExpandable' && prop !== 'isHighlighted' && prop !== 'isSelected' && prop !== 'hasRowActions',
})<LogRowContentProps>(({ theme, isExpandable, isHighlighted, isSelected, hasRowActions }) => ({
  display: 'grid',
  gridTemplateColumns: isExpandable
    ? `16px minmax(160px, max-content) 1fr ${hasRowActions ? 'min-content' : ''}`
    : `minmax(160px, max-content) 1fr ${hasRowActions ? 'min-content' : ''}`,
  alignItems: 'flex-start',
  padding: '4px 8px',
  cursor: 'default',
  gap: '12px',
  backgroundColor:
    (isHighlighted && theme.palette.action.hover) || (isSelected && theme.palette.action.selected) || 'transparent',
  '&:hover': {
    backgroundColor: isSelected ? theme.palette.action.focus : theme.palette.action.hover,
  },
}));

type ExpandButtonProps = { isExpanded: boolean };

export const ExpandButton: StyledComponent<IconButtonProps & ExpandButtonProps> = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'isExpanded',
})<ExpandButtonProps>(({ theme, isExpanded }) => ({
  padding: 0,
  width: '16px',
  height: '16px',
  color: theme.palette.text.secondary,
  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
  transition: 'transform 0.2s ease',
}));

type LogTextProps = { allowWrap: boolean };

export const LogText: StyledComponent<TypographyProps & LogTextProps> = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'allowWrap',
})<LogTextProps>(({ allowWrap }) => ({
  fontSize: '12px',
  flex: 1,
  lineHeight: 1.4,
  textAlign: 'left',
  ...(allowWrap
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
