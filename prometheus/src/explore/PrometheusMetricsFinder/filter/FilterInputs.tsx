// Copyright 2024 The Perses Authors
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
  cloneElement,
  forwardRef,
  HTMLAttributes,
  ReactElement,
  SyntheticEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Autocomplete,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
} from '@mui/material';
import DeleteIcon from 'mdi-material-ui/Delete';
import { DatasourceSelector } from '@perses-dev/core';
import { Virtuoso } from 'react-virtuoso';
import { LabelFilter, Operator } from '../types';
import { useLabels, useLabelValues } from '../utils';

export interface LabelFilterInputProps {
  datasource: DatasourceSelector;
  value: LabelFilter;
  filters: LabelFilter[];
  onChange: (next: LabelFilter) => void;
  onDelete: () => void;
}

export function LabelFilterInput({
  datasource,
  value,
  filters,
  onChange,
  onDelete,
}: LabelFilterInputProps): ReactElement {
  const filtersWithoutCurrent = useMemo(
    () => filters.filter((filter) => filter.label !== value.label),
    [filters, value.label]
  );

  const { data: labelOptions, isLoading: isLabelOptionsLoading } = useLabels(filtersWithoutCurrent, datasource);
  const { data: labelValuesOptions, isLoading: isLabelValuesOptionsLoading } = useLabelValues(
    value.label,
    filtersWithoutCurrent,
    datasource
  );

  return (
    <RawFilterInput
      value={value}
      labelOptions={labelOptions?.data ?? []}
      labelValuesOptions={labelValuesOptions?.data ?? []}
      isLabelOptionsLoading={isLabelOptionsLoading}
      isLabelValuesOptionsLoading={isLabelValuesOptionsLoading}
      onChange={onChange}
      onDelete={onDelete}
    />
  );
}

// https://stackoverflow.com/questions/69060738/material-ui-autocomplete-virtualization-w-react-virtuoso
export const ListboxComponent = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ children, ...rest }, ref) => {
    const data = children as ReactElement[];
    const localRef = useRef<string>('500px');

    const [height, setHeight] = useState(0);

    return (
      <ul
        style={{ overflow: 'hidden', padding: '0', height: height ? `min(40vh, ${height}px)` : '40vh' }}
        ref={(reference) => {
          const maxHeight = reference ? getComputedStyle(reference).maxHeight : null;
          if (maxHeight && maxHeight !== localRef.current) {
            localRef.current = maxHeight;
          }

          if (typeof ref === 'function') {
            ref(reference);
          }
        }}
        {...rest}
      >
        <Virtuoso
          style={{ height: localRef.current, padding: '10px 0' }}
          data={data}
          totalListHeightChanged={setHeight}
          itemContent={(index, child) => {
            return cloneElement(child, { index, title: child.props.children });
          }}
        />
      </ul>
    );
  }
);
ListboxComponent.displayName = 'ListboxComponent';

export interface RawFilterInputProps {
  value: LabelFilter;
  labelOptions?: string[];
  labelValuesOptions?: string[];
  isLabelOptionsLoading?: boolean;
  isLabelValuesOptionsLoading?: boolean;
  onChange: (next: LabelFilter) => void;
  onDelete: () => void;
}

export function RawFilterInput({
  value,
  labelOptions,
  labelValuesOptions,
  isLabelOptionsLoading,
  isLabelValuesOptionsLoading,
  onChange,
  onDelete,
}: RawFilterInputProps): ReactElement {
  return (
    <Stack gap={0} flexDirection="row" alignItems="center">
      <Autocomplete
        freeSolo
        disableClearable
        options={labelOptions ?? []}
        value={value.label}
        sx={{ minWidth: 200 }}
        ListboxComponent={ListboxComponent}
        loading={isLabelOptionsLoading}
        renderInput={(params) => {
          return (
            <TextField
              {...params}
              label="Label Name"
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                },
              }}
            />
          );
        }}
        onInputChange={(_: SyntheticEvent, newValue: string | null) => {
          onChange({ label: newValue ?? '', labelValues: value.labelValues, operator: value.operator });
        }}
      />
      <Select
        value={value.operator}
        variant="outlined"
        onChange={(event: SelectChangeEvent) => {
          if (value.operator === '=' || value.operator === '!=') {
            // switch from single to multiple
            return onChange({ label: value.label, labelValues: [], operator: event.target.value as Operator });
          }

          if (value.operator === '=~' || value.operator === '!~') {
            // switch from multiple to single, keep the first value if exists
            return onChange({
              label: value.label,
              labelValues: value.labelValues.slice(0, 1),
              operator: event.target.value as Operator,
            });
          }

          onChange({ label: value.label, labelValues: value.labelValues, operator: event.target.value as Operator });
        }}
        size="medium"
        sx={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
      >
        <MenuItem value="=">=</MenuItem>
        <MenuItem value="!=">!=</MenuItem>
        <MenuItem value="=~">=~</MenuItem>
        <MenuItem value="!~">!~</MenuItem>
      </Select>
      <Autocomplete
        freeSolo
        multiple={value.operator === '=~' || value.operator === '!~'}
        limitTags={1}
        disableClearable
        options={labelValuesOptions ?? []}
        value={value.labelValues}
        ListboxComponent={ListboxComponent}
        sx={{ minWidth: 200 }}
        loading={isLabelValuesOptionsLoading}
        renderInput={(params) => {
          return (
            <TextField
              {...params}
              label={value.operator === '=~' || value.operator === '!~' ? 'Label Values' : 'Label Value'}
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                },
              }}
              slotProps={{
                input: {
                  ...params.InputProps,
                  style: {
                    maxHeight: '53.13px', // TODO: the input height is larger when a value is selected in multiple mode. Probably a bug fixed in newer version, could not replicate on their demo
                  },
                  endAdornment: (
                    <InputAdornment position="end">
                      {isLabelValuesOptionsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      <IconButton aria-label="delete label filter" onClick={() => onDelete()} edge="end">
                        <DeleteIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          );
        }}
        onInputChange={(_, newValue) => {
          if (value.operator === '=' || value.operator === '!=') {
            onChange({ label: value.label, labelValues: [newValue], operator: value.operator });
          }
        }}
        onChange={(_, newValue) => {
          if (Array.isArray(newValue)) {
            onChange({ label: value.label, labelValues: newValue, operator: value.operator });
          }
        }}
      />
    </Stack>
  );
}
