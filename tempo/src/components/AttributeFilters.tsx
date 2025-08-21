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

import { ReactElement, SyntheticEvent, useCallback, useEffect, useState } from 'react';
import { Autocomplete, Checkbox, Stack, TextField, TextFieldProps } from '@mui/material';
import { isAbsoluteTimeRange, toAbsoluteTimeRange } from '@perses-dev/core';
import { useTimeRange } from '@perses-dev/plugin-system';
import { useQuery } from '@tanstack/react-query';
import CheckboxOutline from 'mdi-material-ui/CheckboxOutline';
import CheckboxBlankOutline from 'mdi-material-ui/CheckboxBlankOutline';
import { TempoClient } from '../model';
import { filterToTraceQL } from './filter/filter_to_traceql';
import { traceQLToFilter } from './filter/traceql_to_filter';
import { DurationField, Filter, splitByUnquotedWhitespace } from './filter/filter';

const statusOptions = ['unset', 'ok', 'error'];

export interface AttributeFiltersProps {
  client?: TempoClient;
  query: string;
  setQuery: (x: string) => void;
}

export function AttributeFilters(props: AttributeFiltersProps): ReactElement {
  const { client, query, setQuery } = props;

  const filter = traceQLToFilter(query);
  const setFilter = (filter: Filter) => {
    setQuery(filterToTraceQL(filter));
  };

  const { timeRange } = useTimeRange();
  const absTimeRange = !isAbsoluteTimeRange(timeRange) ? toAbsoluteTimeRange(timeRange) : timeRange;
  const startTime = Math.round(absTimeRange.start.getTime() / 1000);
  const endTime = Math.round(absTimeRange.end.getTime() / 1000);

  const { data: serviceNameOptions } = useTagValues(
    client,
    'resource.service.name',
    filterToTraceQL({ ...filter, serviceName: [] }),
    startTime,
    endTime
  );
  const { data: spanNameOptions } = useTagValues(
    client,
    'name',
    filterToTraceQL({ ...filter, spanName: [] }),
    startTime,
    endTime
  );

  return (
    <>
      <StringAttributeFilter
        label="Service Name"
        options={serviceNameOptions ?? []}
        value={filter.serviceName}
        setValue={(x) => setFilter({ ...filter, serviceName: x })}
      />
      <StringAttributeFilter
        label="Span Name"
        options={spanNameOptions ?? []}
        value={filter.spanName}
        setValue={(x) => setFilter({ ...filter, spanName: x })}
      />
      <StringAttributeFilter
        label="Status"
        width={210}
        options={statusOptions ?? []}
        value={filter.status}
        setValue={(x) => setFilter({ ...filter, status: x })}
      />
      <DurationAttributeFilter
        label="Trace Duration"
        value={filter.traceDuration}
        setValue={(value) => setFilter({ ...filter, traceDuration: value })}
      />
      <CustomAttributesFilter
        label="Custom Attributes"
        value={filter.customMatchers}
        setValue={(value) => setFilter({ ...filter, customMatchers: value })}
      />
    </>
  );
}

interface StringAttributeFilterProps {
  label: string;
  width?: number;
  options: string[];
  value: string[];
  setValue: (value: string[]) => void;
}

const checkboxBlankIcon = <CheckboxBlankOutline fontSize="small" />;
const checkedMarkedIcon = <CheckboxOutline fontSize="small" />;

function StringAttributeFilter(props: StringAttributeFilterProps) {
  const { label, width, options, value, setValue } = props;

  return (
    <Autocomplete
      multiple
      size="small"
      limitTags={1}
      disableCloseOnSelect
      value={value}
      onChange={(_event: SyntheticEvent, newValue: string[]) => setValue(newValue)}
      options={options}
      renderOption={(props, option, { selected }) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <Checkbox
              icon={checkboxBlankIcon}
              checkedIcon={checkedMarkedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option}
          </li>
        );
      }}
      renderInput={(params) => <TextField {...params} label={label} />}
      // Reduce the size of the chips to make space for the <input> element, the +X text and the X button to avoid a line break.
      // See https://github.com/mui/material-ui/issues/38835 for more details.
      slotProps={{ chip: { sx: { maxWidth: 'calc(100% - 45px) !important' } } }}
      // Reduce the size of the <input> field
      sx={{ width: width ?? 250, '& input': { minWidth: '5px !important' } }}
    />
  );
}

interface DurationAttributeFilterProps {
  label: string;
  value: DurationField;
  setValue: (value: DurationField) => void;
}

function DurationAttributeFilter(props: DurationAttributeFilterProps) {
  const { label, value, setValue } = props;
  const { min, max } = value;

  return (
    <Stack direction="row" gap={0.5}>
      <DurationTextInput label={`Min ${label}`} value={min ?? ''} setValue={(min) => setValue({ min, max })} />
      <DurationTextInput label={`Max ${label}`} value={max ?? ''} setValue={(max) => setValue({ min, max })} />
    </Stack>
  );
}

const durationFormatRegex = /^([0-9]+\.)?[0-9]+(ns|ms|s|m|h)$/;

interface DurationTextInputProps {
  label: string;
  value: string;
  setValue: (value: string) => void;
}

function DurationTextInput(props: DurationTextInputProps) {
  const { label, value, setValue } = props;

  return (
    <LazyTextInput
      label={label}
      size="small"
      value={value}
      setValue={setValue}
      validationRegex={durationFormatRegex}
      validationFailedMessage="Invalid format. Accepted format e.g. 100ms, accepted units: ns, ms, s, m, h"
      sx={{ width: 150 }}
    />
  );
}

interface CustomAttributesFilterProps {
  label: string;
  value: string[];
  setValue: (value: string[]) => void;
}

function CustomAttributesFilter(props: CustomAttributesFilterProps) {
  const { label, value, setValue } = props;

  return (
    <LazyTextInput
      label={label}
      size="small"
      placeholder='span.http.status_code=200 span.http.method="GET"'
      value={value.join(' ')}
      setValue={(x) => setValue(splitByUnquotedWhitespace(x))}
      sx={{ flexGrow: 1 }}
    />
  );
}

interface LazyTextInputProps extends Omit<TextFieldProps, 'variant'> {
  validationRegex?: RegExp;
  validationFailedMessage?: string;
  value: string;
  setValue: (value: string) => void;
}

/** A <TextField> which calls props.setValue when the input field is blurred and the validation passes. */
function LazyTextInput(props: LazyTextInputProps) {
  const { validationRegex, validationFailedMessage, value, setValue, ...otherProps } = props;
  const [draftValue, setDraftValue] = useState(value);
  const isValidInput = draftValue == '' || validationRegex == undefined || validationRegex.test(draftValue);

  useEffect(() => {
    setDraftValue(value);
  }, [value, setDraftValue]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftValue(event.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    if (isValidInput) {
      setValue(draftValue);
    }
  }, [isValidInput, setValue, draftValue]);

  return (
    <TextField
      {...otherProps}
      error={!isValidInput}
      helperText={isValidInput ? undefined : validationFailedMessage}
      value={draftValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

function useTagValues(client: TempoClient | undefined, tag: string, query: string, start?: number, end?: number) {
  return useQuery({
    queryKey: ['useTagValues', client, tag, query, start, end],
    enabled: !!client,
    queryFn: async function () {
      if (!client) return;
      const values = await client.searchTagValues({ tag, q: query, start, end });
      return values.tagValues.map((tagValue) => tagValue.value ?? '').sort();
    },
    staleTime: 60 * 1000, // cache tag value response for 1m
  });
}
