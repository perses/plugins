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

import type { TooltipProps as MuiTooltipProps } from '@mui/material';
import { Box, IconButton, Tooltip as MuiTooltip, tooltipClasses, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import InformationOutlineIcon from 'mdi-material-ui/InformationOutline';
import type { ReactElement } from 'react';
import { forwardRef, useMemo } from 'react';

import type { ShortcutTooltip } from '../../utils/shortcuts';
import { EDITOR_SHORTCUTS, VIEW_SHORTCUTS } from '../../utils/shortcuts';

const Tooltip = styled(({ className, ...props }: MuiTooltipProps) => {
  const classes = useMemo(() => ({ popper: className }), [className]);
  return <MuiTooltip {...props} classes={classes} />;
})(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.tooltip,
    color: theme.palette.text.primary,
    maxWidth: '300px',
    padding: theme.spacing(1),
    boxShadow: theme.shadows[1],
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.background.tooltip,
  },
}));

const styles = {
  key: {
    px: 0.75,
    py: 0.25,
    borderRadius: 0.5,
    border: 1,
    borderColor: 'divider',
    backgroundColor: 'action.hover',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 0.25 },
  keys: { display: 'flex', gap: 0.5 },
  title: { fontWeight: 'medium', mb: 0.5 },
} as const;

function ShortcutList({ rows }: { rows: readonly ShortcutTooltip[] }): ReactElement {
  return (
    <>
      {rows.map(({ keys, action }) => (
        <Box key={action} sx={styles.row}>
          <Typography variant="caption">{action}</Typography>
          <Box sx={styles.keys}>
            {keys.map((key) => (
              <Typography key={key} component="kbd" sx={styles.key}>
                {key}
              </Typography>
            ))}
          </Box>
        </Box>
      ))}
    </>
  );
}

const VIEW_ROWS: ShortcutTooltip[] = VIEW_SHORTCUTS.map((s) => s.tooltip);
const EDITOR_ROWS: ShortcutTooltip[] = EDITOR_SHORTCUTS.map((s) => s.tooltip);

function TooltipTitle({ rows }: { rows: readonly ShortcutTooltip[] }): ReactElement {
  return (
    <Box>
      <Typography sx={styles.title}>Canvas shortcuts</Typography>
      <ShortcutList rows={rows} />
    </Box>
  );
}

const VIEW_TOOLTIP_TITLE = <TooltipTitle rows={VIEW_ROWS} />;
const EDITOR_TOOLTIP_TITLE = <TooltipTitle rows={EDITOR_ROWS} />;

const ShortcutsButton = forwardRef<HTMLButtonElement>(function ShortcutsButton(props, ref) {
  return (
    <IconButton ref={ref} size="small" aria-label="Canvas interaction shortcuts" {...props}>
      <InformationOutlineIcon fontSize="small" />
    </IconButton>
  );
});

function ShortcutsTooltip({ title }: { title: ReactElement }): ReactElement {
  return (
    <Tooltip arrow placement="left" enterDelay={200} enterNextDelay={200} title={title}>
      <ShortcutsButton />
    </Tooltip>
  );
}

export function ViewCanvasShortcutsTooltip(): ReactElement {
  return <ShortcutsTooltip title={VIEW_TOOLTIP_TITLE} />;
}

export function EditorCanvasShortcutsTooltip(): ReactElement {
  return <ShortcutsTooltip title={EDITOR_TOOLTIP_TITLE} />;
}
