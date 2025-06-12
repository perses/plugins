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

import { ReactElement, useState } from 'react';
import RefreshIcon from 'mdi-material-ui/Refresh';
import PaletteIcon from 'mdi-material-ui/Palette';
import ExportIcon from 'mdi-material-ui/Export';
import { Stack, Button, useTheme, MenuItem, Menu, Fade } from '@mui/material';
import { ToolbarIconButton, InfoTooltip } from '@perses-dev/components';
import { TOOLTIP_TEXT } from '../utils/ui-text';

export interface OptionsProps {
  onClick: () => void;
}

export function Options(props: OptionsProps): ReactElement {
  const { onClick } = props;
  const theme = useTheme();
  const [selectedView, setSelectedView] = useState<'table' | 'flame-graph' | 'both'>('both');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleChangeColorShemeClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleByPackageNameClick = () => {
    // set color scheme to package name
    handleClose();
  };

  const handleByValueClick = () => {
    // set color scheme to value
    handleClose();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isTableSelected = () => selectedView === 'table';
  const isFlameGraphSelected = () => selectedView === 'flame-graph';
  const isBothSelected = () => selectedView === 'both';

  return (
    <Stack spacing="10px" direction="row" justifyContent="center" alignItems="center">
      <InfoTooltip description={TOOLTIP_TEXT.resetFlameGraph}>
        <ToolbarIconButton aria-label={TOOLTIP_TEXT.resetFlameGraph} onClick={onClick}>
          <RefreshIcon />
        </ToolbarIconButton>
      </InfoTooltip>
      <Stack>
        <InfoTooltip description={TOOLTIP_TEXT.changeColorSheme}>
          <ToolbarIconButton
            id="change-color-sheme-button"
            aria-label={TOOLTIP_TEXT.changeColorSheme}
            aria-controls={open ? 'change-color-sheme-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleChangeColorShemeClick}
          >
            <PaletteIcon />
          </ToolbarIconButton>
        </InfoTooltip>
        <Menu
          id="change-color-sheme-menu"
          MenuListProps={{
            'aria-labelledby': 'change-color-sheme-button',
          }}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          TransitionComponent={Fade}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          sx={{
            mt: 1,
            '& .MuiPaper-root': {
              backgroundColor: theme.palette.background.paper,
              padding: '0 5px',
            },
            '& .MuiMenuItem-root:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          <MenuItem onClick={handleByPackageNameClick}>By package name</MenuItem>
          <MenuItem onClick={handleByValueClick}>By value</MenuItem>
        </Menu>
      </Stack>
      <Stack
        direction="row"
        sx={{
          border: `1px solid ${theme.palette.action.disabled}`,
          borderRadius: `${theme.shape.borderRadius}px`,
          padding: '2px',
        }}
      >
        <InfoTooltip description={TOOLTIP_TEXT.showTable}>
          <Button
            variant={isTableSelected() ? 'contained' : 'text'}
            color="secondary"
            size="small"
            onClick={() => setSelectedView('table')}
          >
            Table
          </Button>
        </InfoTooltip>
        <InfoTooltip description={TOOLTIP_TEXT.showFlameGraph}>
          <Button
            variant={isFlameGraphSelected() ? 'contained' : 'text'}
            color="secondary"
            size="small"
            onClick={() => setSelectedView('flame-graph')}
          >
            Flame Graph
          </Button>
        </InfoTooltip>
        <InfoTooltip description={TOOLTIP_TEXT.showBoth}>
          <Button
            variant={isBothSelected() ? 'contained' : 'text'}
            color="secondary"
            size="small"
            onClick={() => setSelectedView('both')}
          >
            Both
          </Button>
        </InfoTooltip>
      </Stack>
      <InfoTooltip description={TOOLTIP_TEXT.exportData}>
        <ToolbarIconButton aria-label={TOOLTIP_TEXT.exportData}>
          <ExportIcon />
        </ToolbarIconButton>
      </InfoTooltip>
    </Stack>
  );
}
