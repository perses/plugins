// Copyright 2023 The Perses Authors
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

import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { OptionsColorPicker } from '@perses-dev/components';
import React, { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import DeleteIcon from 'mdi-material-ui/DeleteOutline';
import AddIcon from 'mdi-material-ui/Plus';
import CloseIcon from 'mdi-material-ui/Close';
import { produce } from 'immer';
import { useQueryCountContext } from '@perses-dev/plugin-system';
import {
  TimeSeriesChartOptions,
  TimeSeriesChartOptionsEditorProps,
  QuerySettingsOptions,
  DEFAULT_AREA_OPACITY,
  OPACITY_CONFIG,
  LINE_STYLE_CONFIG,
} from './time-series-chart-model';

const DEFAULT_COLOR_VALUE = '#555';
const NO_INDEX_AVAILABLE = -1; // invalid array index value used to represent the fact that no query index is available

export function QuerySettingsEditor(props: TimeSeriesChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;
  const querySettingsList = value.querySettings;

  const handleQuerySettingsChange = (newQuerySettings: QuerySettingsOptions[]) => {
    onChange(
      produce(value, (draft: TimeSeriesChartOptions) => {
        draft.querySettings = newQuerySettings;
      })
    );
  };
  // Every time a new query settings input is added, we want to focus the recently added input
  const recentlyAddedInputRef = useRef<HTMLInputElement | null>(null);
  const focusRef = useRef(false);
  useEffect(() => {
    if (!recentlyAddedInputRef.current || !focusRef.current) return;
    recentlyAddedInputRef.current?.focus();
    focusRef.current = false;
  }, [querySettingsList?.length]);

  const handleQueryIndexChange = (e: React.ChangeEvent<HTMLInputElement>, i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const querySettings = draft?.[i];
          if (querySettings) {
            querySettings.queryIndex = parseInt(e.target.value);
          }
        })
      );
    }
  };

  const handleColorModeChange = (e: React.ChangeEvent<HTMLInputElement>, i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          if (draft !== undefined) {
            const querySettings = draft[i];
            if (querySettings) {
              const newColorMode = e.target.value;
              if (!newColorMode) {
                querySettings.colorMode = undefined;
                querySettings.colorValue = undefined;
              } else {
                querySettings.colorMode = newColorMode as QuerySettingsOptions['colorMode'];
              }
            }
          }
        })
      );
    }
  };

  const handleColorValueChange = (colorValue: string, i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          if (draft !== undefined) {
            const querySettings = draft[i];
            if (querySettings) {
              querySettings.colorValue = colorValue;
            }
          }
        })
      );
    }
  };

  const handleLineStyleChange = (lineStyle: string, i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          if (draft !== undefined) {
            const querySettings = draft[i];
            if (querySettings) {
              querySettings.lineStyle = lineStyle as QuerySettingsOptions['lineStyle'];
            }
          }
        })
      );
    }
  };

  const handleAreaOpacityChange = (_: Event, sliderValue: number | number[], i: number): void => {
    const newValue = Array.isArray(sliderValue) ? sliderValue[0] : sliderValue;
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          if (draft !== undefined) {
            const querySettings = draft[i];
            if (querySettings) {
              querySettings.areaOpacity = newValue;
            }
          }
        })
      );
    }
  };

  // Helper function to update query settings at a specific index
  const updateQuerySettings = (i: number, updater: (qs: QuerySettingsOptions) => void): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const qs = draft[i];
          if (qs) {
            updater(qs);
          }
        })
      );
    }
  };

  const deleteQuerySettingsInput = (i: number): void => {
    if (querySettingsList !== undefined) {
      const updatedQuerySettingsList = produce(querySettingsList, (draft) => {
        draft.splice(i, 1);
      });
      handleQuerySettingsChange(updatedQuerySettingsList);
    }
  };

  const addColor = (i: number): void => {
    updateQuerySettings(i, (qs) => {
      qs.colorMode = 'fixed-single';
      qs.colorValue = DEFAULT_COLOR_VALUE;
    });
  };

  const removeColor = (i: number): void => {
    updateQuerySettings(i, (qs) => {
      qs.colorMode = undefined;
      qs.colorValue = undefined;
    });
  };

  const addLineStyle = (i: number): void => {
    updateQuerySettings(i, (qs) => {
      qs.lineStyle = 'solid';
    });
  };

  const removeLineStyle = (i: number): void => {
    updateQuerySettings(i, (qs) => {
      qs.lineStyle = undefined;
    });
  };

  const addAreaOpacity = (i: number): void => {
    updateQuerySettings(i, (qs) => {
      qs.areaOpacity = DEFAULT_AREA_OPACITY;
    });
  };

  const removeAreaOpacity = (i: number): void => {
    updateQuerySettings(i, (qs) => {
      qs.areaOpacity = undefined;
    });
  };

  const queryCount = useQueryCountContext();

  // Compute the list of query indexes for which query settings are not already defined.
  // This is to avoid already-booked indexes to still be selectable in the dropdown(s)
  const availableQueryIndexes = useMemo(() => {
    const bookedQueryIndexes = querySettingsList?.map((querySettings) => querySettings.queryIndex) ?? [];
    const allQueryIndexes = Array.from({ length: queryCount }, (_, i) => i);
    return allQueryIndexes.filter((_, queryIndex) => !bookedQueryIndexes.includes(queryIndex));
  }, [querySettingsList, queryCount]);

  const firstAvailableQueryIndex = useMemo(() => {
    return availableQueryIndexes[0] ?? NO_INDEX_AVAILABLE;
  }, [availableQueryIndexes]);

  const defaultQuerySettings: QuerySettingsOptions = {
    queryIndex: firstAvailableQueryIndex,
  };

  const addQuerySettingsInput = (): void => {
    focusRef.current = true;
    if (querySettingsList === undefined) {
      handleQuerySettingsChange([defaultQuerySettings]);
    } else {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          draft.push(defaultQuerySettings);
        })
      );
    }
  };

  return (
    <Stack>
      {queryCount === 0 ? (
        <Typography mb={2} fontStyle="italic">
          No query defined
        </Typography>
      ) : (
        querySettingsList?.length &&
        querySettingsList.map((querySettings, i) => (
          <QuerySettingsInput
            inputRef={i === querySettingsList.length - 1 ? recentlyAddedInputRef : undefined}
            key={i}
            querySettings={querySettings}
            availableQueryIndexes={availableQueryIndexes}
            onQueryIndexChange={(e) => {
              handleQueryIndexChange(e, i);
            }}
            onColorModeChange={(e) => handleColorModeChange(e, i)}
            onColorValueChange={(color) => handleColorValueChange(color, i)}
            onLineStyleChange={(lineStyle) => handleLineStyleChange(lineStyle, i)}
            onAreaOpacityChange={(event, value) => handleAreaOpacityChange(event, value, i)}
            onDelete={() => {
              deleteQuerySettingsInput(i);
            }}
            onAddColor={() => addColor(i)}
            onRemoveColor={() => removeColor(i)}
            onAddLineStyle={() => addLineStyle(i)}
            onRemoveLineStyle={() => removeLineStyle(i)}
            onAddAreaOpacity={() => addAreaOpacity(i)}
            onRemoveAreaOpacity={() => removeAreaOpacity(i)}
          />
        ))
      )}
      {queryCount > 0 && firstAvailableQueryIndex !== NO_INDEX_AVAILABLE && (
        <Button variant="contained" startIcon={<AddIcon />} sx={{ marginTop: 1 }} onClick={addQuerySettingsInput}>
          Add Query Settings
        </Button>
      )}
    </Stack>
  );
}

interface QuerySettingsInputProps {
  querySettings: QuerySettingsOptions;
  availableQueryIndexes: number[];
  onQueryIndexChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onColorModeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onColorValueChange: (colorValue: string) => void;
  onLineStyleChange: (lineStyle: string) => void;
  onAreaOpacityChange: (event: Event, value: number | number[]) => void;
  onDelete: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  // Optional control handlers
  onAddColor: () => void;
  onRemoveColor: () => void;
  onAddLineStyle: () => void;
  onRemoveLineStyle: () => void;
  onAddAreaOpacity: () => void;
  onRemoveAreaOpacity: () => void;
}

function QuerySettingsInput({
  querySettings: { queryIndex, colorMode, colorValue, lineStyle, areaOpacity },
  availableQueryIndexes,
  onQueryIndexChange,
  onColorModeChange,
  onColorValueChange,
  onLineStyleChange,
  onAreaOpacityChange,
  onDelete,
  inputRef,
  onAddColor: onAddColor,
  onRemoveColor: onRemoveColor,
  onAddLineStyle,
  onRemoveLineStyle,
  onAddAreaOpacity,
  onRemoveAreaOpacity,
}: QuerySettingsInputProps): ReactElement {
  // current query index should also be selectable
  const selectableQueryIndexes = availableQueryIndexes.concat(queryIndex).sort((a, b) => a - b);

  // State for dropdown menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Calculate available options
  const availableOptions = useMemo(() => {
    const options = [];
    if (!colorMode) options.push({ key: 'color', label: 'Color', action: onAddColor });
    if (!lineStyle) options.push({ key: 'lineStyle', label: 'Line Style', action: onAddLineStyle });
    if (areaOpacity === undefined) options.push({ key: 'opacity', label: 'Opacity', action: onAddAreaOpacity });
    return options;
  }, [colorMode, lineStyle, areaOpacity, onAddColor, onAddLineStyle, onAddAreaOpacity]);

  const handleAddMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    if (availableOptions.length === 1 && availableOptions[0]) {
      // If only one option left, add it directly
      availableOptions[0].action();
    } else {
      // Show dropdown
      setAnchorEl(event.currentTarget);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    handleMenuClose();
  };

  return (
    <Stack spacing={2} sx={{ borderBottom: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {/* Query Index Selection */}
        <TextField
          select
          inputRef={inputRef}
          value={queryIndex}
          label="Query"
          onChange={onQueryIndexChange}
          sx={{ minWidth: '75px' }}
        >
          {selectableQueryIndexes.map((qi) => (
            <MenuItem key={`query-${qi}`} value={qi}>
              #{qi + 1}
            </MenuItem>
          ))}
        </TextField>

        {/* Color section */}
        {colorMode && (
          <SettingsSection label="Color" onRemove={onRemoveColor}>
            <TextField select value={colorMode} onChange={onColorModeChange} size="small" sx={{ flexGrow: 1 }}>
              <MenuItem value="fixed-single">Fixed (single)</MenuItem>
              <MenuItem value="fixed">Fixed</MenuItem>
            </TextField>
            <OptionsColorPicker
              label={`Query n°${queryIndex + 1}`}
              color={colorValue || DEFAULT_COLOR_VALUE}
              onColorChange={onColorValueChange}
            />
          </SettingsSection>
        )}

        {/* Line Style section */}
        {lineStyle && (
          <SettingsSection label="Line Style" onRemove={onRemoveLineStyle}>
            <ToggleButtonGroup
              color="primary"
              exclusive
              value={lineStyle}
              onChange={(__, newValue) => {
                if (newValue !== null) {
                  onLineStyleChange(newValue);
                }
              }}
              size="small"
            >
              {Object.entries(LINE_STYLE_CONFIG).map(([styleValue, config]) => (
                <ToggleButton key={styleValue} value={styleValue} aria-label={`${styleValue} line style`}>
                  {config.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {/* Spacer to push delete button to the right */}
            <Box sx={{ flexGrow: 1 }} />
          </SettingsSection>
        )}

        {/* Area Opacity section */}
        {areaOpacity !== undefined && (
          <SettingsSection label="Opacity" onRemove={onRemoveAreaOpacity}>
            {/* Spacer as I don't want to add a prop to SettingsSection for left-padding just for that case.. */}
            <Box />
            <Slider
              value={areaOpacity}
              valueLabelDisplay="auto"
              step={OPACITY_CONFIG.step}
              marks
              min={OPACITY_CONFIG.min}
              max={OPACITY_CONFIG.max}
              onChange={onAreaOpacityChange}
              sx={{ flexGrow: 1 }}
            />
          </SettingsSection>
        )}

        {/* Add Options Button - only show if there are available options */}
        {availableOptions.length > 0 && (
          <>
            <IconButton onClick={handleAddMenuClick} aria-label="Add option">
              <AddIcon />
            </IconButton>

            {/* Dropdown Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
            >
              {availableOptions.map((option) => (
                <MenuItem
                  key={option.key}
                  onClick={() => handleMenuItemClick(option.action)}
                  sx={{ minWidth: '120px' }}
                >
                  <AddIcon sx={{ mr: 1, fontSize: '1rem' }} />
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {/* Spacer to push delete button to the right */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Delete Button for this query settings */}
        <IconButton aria-label={`delete settings for query n°${queryIndex + 1}`} onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
}

interface SettingsSectionProps {
  label: string;
  children: React.ReactNode;
  onRemove: () => void;
}

// Reusable section component
function SettingsSection(props: SettingsSectionProps): ReactElement {
  const { label, children, onRemove } = props;
  const theme = useTheme();

  return (
    <Box sx={{ position: 'relative', minWidth: '250px' }}>
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          top: -8,
          left: 12,
          backgroundColor: theme.palette.background.code,
          px: 0.5,
          color: 'text.secondary',
          zIndex: 1,
        }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1,
        }}
      >
        {children}
        <IconButton size="small" onClick={onRemove} aria-label={`Remove ${label}`}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}
