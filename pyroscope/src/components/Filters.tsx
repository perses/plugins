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

import { ReactElement, useState, useEffect } from 'react';
import { InputLabel, Stack, useTheme } from '@mui/material';
import { PyroscopeClient } from '../model';
import { FilterItem } from './FilterItem';
import { AddFilterItem } from './AddFilterItem';

export interface FiltersProps {
  client: PyroscopeClient | undefined;
  value: Array<{ id: number; value: string }>;
  onChange?(value: Array<{ id: number; value: string }>): void;
}

export function Filters(props: FiltersProps): ReactElement {
  const theme = useTheme();
  const { client, value, onChange } = props;

  // state to manage the focus
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value.length === 0) {
      onChange?.([{ id: Date.now(), value: '' }]); // keep at least one empty filter
    }
  }, [value, onChange]);

  const addFilterItem = () => {
    const updatedFilters = [...value, { id: Date.now(), value: '' }];
    onChange?.(updatedFilters);
  };

  const updateFilter = (index: number, newValue: string) => {
    const updatedFilters = value.map((filter, i) => (i === index ? { ...filter, value: newValue } : filter));
    onChange?.(updatedFilters);
  };

  const deleteFilter = (index: number) => {
    const updatedFilters = value.filter((_, i) => i !== index);
    onChange?.(updatedFilters);
  };

  return (
    <Stack
      position="relative"
      direction="row"
      spacing={0}
      sx={{
        flexWrap: 'wrap',
        rowGap: 1,
        gap: 1,
        padding: '10px',
        border: `${isFocused ? '2px solid' + theme.palette.primary.main : '1px solid rgba(0, 0, 0, 0.23)'}`,
        borderRadius: '5px',
        transition: 'border-color 0.3s',
        '&:hover': {
          borderColor: `${!isFocused && 'black'}`,
        },
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
    >
      <InputLabel
        shrink
        sx={{
          position: 'absolute',
          top: '-6px',
          left: '10px',
          padding: '0 4px',
          color: `${isFocused ? theme.palette.primary.main : theme.palette.text.primary}`,
          backgroundColor: theme.palette.background.default,
          zIndex: 1,
        }}
      >
        Filters
      </InputLabel>
      {value.map((filter, index) => (
        <FilterItem
          key={filter.id}
          client={client}
          value={filter.value}
          onChange={(newValue) => updateFilter(index, newValue)}
          deleteItem={() => deleteFilter(index)}
        />
      ))}
      <AddFilterItem onClick={addFilterItem} />
    </Stack>
  );
}
