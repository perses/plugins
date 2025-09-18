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

import { Box, IconButton, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material';
import { InfoTooltip, OptionsColorPicker } from '@perses-dev/components';
import { ReactElement, RefObject, useEffect, useMemo, useRef } from 'react';
import DeleteIcon from 'mdi-material-ui/DeleteOutline';
import PlusIcon from 'mdi-material-ui/Plus';
import { produce } from 'immer';
import { useQueryCountContext } from '@perses-dev/plugin-system';
import {
  TimeSeriesChartOptions,
  TimeSeriesChartOptionsEditorProps,
  QuerySettingsOptions,
  DEFAULT_AREA_OPACITY,
  OPACITY_CONFIG,
} from './time-series-chart-model';

const DEFAULT_COLOR_MODE = 'fixed';
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
              querySettings.colorMode = e.target.value as QuerySettingsOptions['colorMode'];
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
    colorMode: DEFAULT_COLOR_MODE,
    colorValue: DEFAULT_COLOR_VALUE,
    areaOpacity: DEFAULT_AREA_OPACITY,
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
    <Stack spacing={2}>
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
            onAreaOpacityChange={(event, value) => handleAreaOpacityChange(event, value, i)}
            onDelete={() => {
              deleteQuerySettingsInput(i);
            }}
          />
        ))
      )}
      {queryCount > 0 && firstAvailableQueryIndex !== NO_INDEX_AVAILABLE && (
        <InfoTooltip description="Add query settings">
          <IconButton size="small" aria-label="add query settings" onClick={addQuerySettingsInput}>
            <PlusIcon />
          </IconButton>
        </InfoTooltip>
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
  onAreaOpacityChange: (event: Event, value: number | number[]) => void;
  onDelete: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

function QuerySettingsInput({
  querySettings: { queryIndex, colorMode, colorValue, areaOpacity = DEFAULT_AREA_OPACITY },
  availableQueryIndexes,
  onQueryIndexChange,
  onColorModeChange,
  onColorValueChange,
  onAreaOpacityChange,
  onDelete,
  inputRef,
}: QuerySettingsInputProps): ReactElement {
  // current query index should also be selectable
  const selectableQueryIndexes = availableQueryIndexes.concat(queryIndex).sort((a, b) => a - b);

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ marginBottom: 2, width: '100%' }}>
      <TextField
        select
        inputRef={inputRef}
        value={queryIndex}
        label="Query"
        onChange={onQueryIndexChange}
        sx={{ minWidth: '75px' }} // instead of `fullWidth` otherwise it's taking too much space
      >
        {selectableQueryIndexes.map((queryIndex) => (
          <MenuItem key={`query-${queryIndex}`} value={queryIndex}>
            #{queryIndex + 1}
          </MenuItem>
        ))}
      </TextField>
      <TextField select value={colorMode} fullWidth label="Color mode" onChange={onColorModeChange}>
        <MenuItem value="fixed-single">Fixed (single)</MenuItem>
        <MenuItem value="fixed">Fixed</MenuItem>
      </TextField>
      <Box>
        <OptionsColorPicker label={'Query n°' + queryIndex} color={colorValue} onColorChange={onColorValueChange} />
      </Box>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="body2">Opacity:</Typography>
        <Slider
          value={areaOpacity}
          valueLabelDisplay="auto"
          step={OPACITY_CONFIG.step}
          marks
          min={OPACITY_CONFIG.min}
          max={OPACITY_CONFIG.max}
          onChange={onAreaOpacityChange}
          sx={{ flex: 1, minWidth: '180px' }}
        />
      </Stack>
      <IconButton aria-label={`delete settings for query n°${queryIndex + 1}`} size="small" onClick={onDelete}>
        <DeleteIcon />
      </IconButton>
    </Stack>
  );
}
