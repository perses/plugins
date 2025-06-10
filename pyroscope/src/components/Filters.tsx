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

import { ReactElement } from 'react';
import { InputLabel, Stack, useTheme } from '@mui/material';
import { PyroscopeDatasourceSelector } from '../model';
import { LabelFilter } from '../utils/types';
import { FilterItem } from './FilterItem';
import { AddFilterItem } from './AddFilterItem';

export interface FiltersProps {
  datasource: PyroscopeDatasourceSelector;
  value: LabelFilter[];
  onChange?: (value: LabelFilter[]) => void;
}

export function Filters(props: FiltersProps): ReactElement {
  const theme = useTheme();
  const { datasource, value, onChange } = props;

  const addFilterItem = () => {
    const newItem: LabelFilter = { labelName: '', labelValue: '', operator: '=' };
    const updatedFilters = [...value, newItem];
    onChange?.(updatedFilters);
  };

  const updateFilter = (index: number, newValue: LabelFilter) => {
    const nextFilters = [...value];
    nextFilters[index] = newValue;
    onChange?.(nextFilters);
  };

  const deleteFilter = (index: number) => {
    const nextFilters = [...value];
    nextFilters.splice(index, 1);
    if (nextFilters.length === 0) {
      onChange?.([{ labelName: '', labelValue: '', operator: '=' }]); // keep at least one empty filter
    } else {
      onChange?.(nextFilters);
    }
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
        border: `1px solid ${theme.palette.action.disabled}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        '&:hover': {
          borderColor: theme.palette.text.primary,
        },
      }}
    >
      <InputLabel
        shrink
        sx={{
          position: 'absolute',
          top: '-6px',
          left: '10px',
          padding: '0 4px',
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.default,
          zIndex: 1,
        }}
      >
        Filters
      </InputLabel>
      {value.map((filter, index) => (
        <FilterItem
          key={`${filter.labelName}:${filter.operator}:${filter.labelValue}`}
          datasource={datasource}
          value={filter}
          onChange={(newValue) => updateFilter(index, newValue)}
          deleteItem={() => deleteFilter(index)}
        />
      ))}
      <AddFilterItem onClick={addFilterItem} />
    </Stack>
  );
}
