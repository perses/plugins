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

import { Box, Stack, useTheme } from '@mui/material';
import type { ReactElement } from 'react';

import type { SpanSelection } from '../span-actions';
import { TicksHeader } from '../Ticks';
import type { Trace } from '../trace';
import type { Viewport } from '../utils';
import { rowHeight } from '../utils';
import { SpanCheckbox } from './SpanCheckbox';

interface GanttTableHeaderProps {
  trace: Trace;
  viewport: Viewport;
  nameColumnWidth: number;
  divider: React.ReactNode;
  selection?: SpanSelection;
}

export function GanttTableHeader(props: GanttTableHeaderProps): ReactElement {
  const { trace, viewport, nameColumnWidth, divider, selection } = props;
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        height: rowHeight,
        fontSize: '0.9rem',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack direction="row" alignItems="center" style={{ width: `${nameColumnWidth * 100}%` }}>
        {selection?.enabled && (
          <SpanCheckbox
            checked={selection.allSelected}
            indeterminate={selection.someSelected}
            onChange={selection.toggleAll}
            aria-label="select all spans"
          />
        )}
        <span style={{ padding: '.25rem' }}>Service & Operation</span>
      </Stack>
      {divider}
      <Box sx={{ position: 'relative', height: '100%', flexGrow: 1 }}>
        <TicksHeader trace={trace} viewport={viewport} />
      </Box>
    </Stack>
  );
}
