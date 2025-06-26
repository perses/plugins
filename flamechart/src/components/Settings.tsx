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

import { ReactElement, useState, useMemo } from 'react';
import RefreshIcon from 'mdi-material-ui/Refresh';
import PaletteIcon from 'mdi-material-ui/Palette';
import { Stack, Button, useTheme, MenuItem, Menu, Fade } from '@mui/material';
import { ToolbarIconButton, InfoTooltip } from '@perses-dev/components';
import { TOOLTIP_TEXT } from '../utils/ui-text';
import { FlameChartOptions } from '../flame-chart-model';

export interface SettingsProps {
  value: FlameChartOptions;
  selectedId: number;
  onChangePalette: (palette: 'package-name' | 'value') => void;
  onSelectedIdChange: (newId: number) => void;
  onDisplayChange: (value: 'table' | 'flame-graph' | 'both') => void;
}

export function Settings(props: SettingsProps): ReactElement {
  const { value, selectedId, onSelectedIdChange, onChangePalette, onDisplayChange } = props;
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const customButtonStyle = {
    fontSize: '12px',
    padding: '2px 6px',
    minWidth: 'auto',
  };

  const handleChangeColorShemeClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleByPackageNameClick = () => {
    onChangePalette('package-name');
    handleClose();
  };

  const handleByValueClick = () => {
    onChangePalette('value');
    handleClose();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isTableSelected = () => selectedView === 'table';
  const isFlameGraphSelected = () => selectedView === 'flame-graph';
  const isBothSelected = () => selectedView === 'both';

  // Update selected view based on the value of showTable and showFlameGraph
  const selectedView: 'table' | 'flame-graph' | 'both' | 'none' = useMemo(() => {
    if (!value.showTable && !value.showFlameGraph) {
      return 'none';
    } else if (value.showTable && value.showFlameGraph) {
      return 'both';
    } else if (value.showTable) {
      return 'table';
    } else {
      return 'flame-graph';
    }
  }, [value.showTable, value.showFlameGraph]);

  return (
    <Stack spacing="10px" direction="row" justifyContent="center" alignItems="center">
      {selectedId !== 0 && (
        <InfoTooltip description={TOOLTIP_TEXT.resetFlameGraph}>
          <ToolbarIconButton
            aria-label={TOOLTIP_TEXT.resetFlameGraph}
            onClick={() => onSelectedIdChange(0)}
            color="primary"
          >
            <RefreshIcon fontSize="small" />
          </ToolbarIconButton>
        </InfoTooltip>
      )}
      <Stack>
        <InfoTooltip description={TOOLTIP_TEXT.changeColorSheme}>
          <ToolbarIconButton
            id="change-color-sheme-button"
            aria-label={TOOLTIP_TEXT.changeColorSheme}
            aria-controls={open ? 'change-color-sheme-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
            onClick={handleChangeColorShemeClick}
            color="primary"
          >
            <PaletteIcon fontSize="small" />
          </ToolbarIconButton>
        </InfoTooltip>
        <Menu
          id="change-color-sheme-menu"
          slotProps={{
            list: { 'aria-labelledby': 'change-color-sheme-button' },
          }}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          slots={{ transition: Fade }}
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
          <MenuItem onClick={handleByPackageNameClick} selected={value.palette === 'package-name'}>
            By package name
          </MenuItem>
          <MenuItem onClick={handleByValueClick} selected={value.palette === 'value'}>
            By value
          </MenuItem>
        </Menu>
      </Stack>
      <Stack
        direction="row"
        sx={{
          border: `1px solid ${theme.palette.primary.main}`,
          borderRadius: `${theme.shape.borderRadius}px`,
          padding: '2px',
        }}
      >
        <InfoTooltip description={TOOLTIP_TEXT.showTable}>
          <Button
            variant={isTableSelected() ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => onDisplayChange('table')}
            sx={customButtonStyle}
          >
            Table
          </Button>
        </InfoTooltip>
        <InfoTooltip description={TOOLTIP_TEXT.showFlameGraph}>
          <Button
            variant={isFlameGraphSelected() ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => onDisplayChange('flame-graph')}
            sx={customButtonStyle}
          >
            Flame Graph
          </Button>
        </InfoTooltip>
        <InfoTooltip description={TOOLTIP_TEXT.showBoth}>
          <Button
            variant={isBothSelected() ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => onDisplayChange('both')}
            sx={customButtonStyle}
          >
            Both
          </Button>
        </InfoTooltip>
      </Stack>
    </Stack>
  );
}
