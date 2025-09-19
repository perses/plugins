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
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { OptionsColorPicker } from '@perses-dev/components';
import { ReactElement, useEffect, useMemo, useRef } from 'react';
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

export function TimeSeriesChartQuerySettings(props: TimeSeriesChartOptionsEditorProps): ReactElement {
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

  const deleteQuerySettingsInput = (i: number): void => {
    if (querySettingsList !== undefined) {
      const updatedQuerySettingsList = produce(querySettingsList, (draft) => {
        draft.splice(i, 1);
      });
      handleQuerySettingsChange(updatedQuerySettingsList);
    }
  };

  // Functions to add/remove optional settings
  const addColorOverride = (i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const qs = draft[i];
          if (qs) {
            qs.colorMode = 'fixed-single';
            qs.colorValue = DEFAULT_COLOR_VALUE;
          }
        })
      );
    }
  };

  const removeColorOverride = (i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const qs = draft[i];
          if (qs) {
            qs.colorMode = undefined;
            qs.colorValue = undefined;
          }
        })
      );
    }
  };

  const addLineStyle = (i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const qs = draft[i];
          if (qs) {
            qs.lineStyle = 'solid';
          }
        })
      );
    }
  };

  const removeLineStyle = (i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const qs = draft[i];
          if (qs) {
            qs.lineStyle = undefined;
          }
        })
      );
    }
  };

  const addAreaOpacity = (i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const qs = draft[i];
          if (qs) {
            qs.areaOpacity = DEFAULT_AREA_OPACITY;
          }
        })
      );
    }
  };

  const removeAreaOpacity = (i: number): void => {
    if (querySettingsList !== undefined) {
      handleQuerySettingsChange(
        produce(querySettingsList, (draft) => {
          const qs = draft[i];
          if (qs) {
            qs.areaOpacity = undefined;
          }
        })
      );
    }
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
        querySettingsList &&
        querySettingsList.length > 0 &&
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
            onAddColorOverride={() => addColorOverride(i)}
            onRemoveColorOverride={() => removeColorOverride(i)}
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
  onAddColorOverride: () => void;
  onRemoveColorOverride: () => void;
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
  onAddColorOverride,
  onRemoveColorOverride,
  onAddLineStyle,
  onRemoveLineStyle,
  onAddAreaOpacity,
  onRemoveAreaOpacity,
}: QuerySettingsInputProps): ReactElement {
  // current query index should also be selectable
  const selectableQueryIndexes = availableQueryIndexes.concat(queryIndex).sort((a, b) => a - b);

  return (
    <Stack spacing={2} sx={{ borderBottom: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      {/* Single row with Query Selection, Optional Controls, and Delete Button */}
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

        {/* Color Override Section */}
        {colorMode ? (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}
          >
            <Typography variant="body2">Color:</Typography>
            <TextField select value={colorMode} onChange={onColorModeChange} sx={{ minWidth: '150px' }} size="small">
              <MenuItem value="fixed-single">Fixed (single)</MenuItem>
              <MenuItem value="fixed">Fixed</MenuItem>
            </TextField>
            <OptionsColorPicker
              label={`Query n°${queryIndex + 1}`}
              color={colorValue || DEFAULT_COLOR_VALUE}
              onColorChange={onColorValueChange}
            />
            <IconButton size="small" onClick={onRemoveColorOverride} aria-label="Remove color override">
              <CloseIcon />
            </IconButton>
          </Stack>
        ) : (
          <Button
            onClick={onAddColorOverride}
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            Color
          </Button>
        )}

        {/* Line Style Section */}
        {lineStyle ? (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}
          >
            <Typography variant="body2">Style:</Typography>
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
            <IconButton size="small" onClick={onRemoveLineStyle} aria-label="Remove line style">
              <CloseIcon />
            </IconButton>
          </Stack>
        ) : (
          <Button
            onClick={onAddLineStyle}
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            Line Style
          </Button>
        )}

        {/* Area Opacity Section */}
        {areaOpacity !== undefined ? (
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minWidth: '240px' }}
          >
            <Typography variant="body2">Opacity:</Typography>
            <Slider
              value={areaOpacity}
              valueLabelDisplay="auto"
              step={OPACITY_CONFIG.step}
              marks
              min={OPACITY_CONFIG.min}
              max={OPACITY_CONFIG.max}
              onChange={onAreaOpacityChange}
              sx={{ flex: 1, minWidth: '140px' }}
            />
            <IconButton size="small" onClick={onRemoveAreaOpacity} aria-label="Remove opacity">
              <CloseIcon />
            </IconButton>
          </Stack>
        ) : (
          <Button
            onClick={onAddAreaOpacity}
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            Opacity
          </Button>
        )}

        {/* Delete Button for entire query settings - at the very right */}
        <Box sx={{ ml: 'auto' }}>
          <IconButton aria-label={`delete settings for query n°${queryIndex + 1}`} size="small" onClick={onDelete}>
            <DeleteIcon />
          </IconButton>
        </Box>
      </Stack>
    </Stack>
  );
}
