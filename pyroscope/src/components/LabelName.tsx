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

import { ReactElement, useMemo } from 'react';
import { TextField, Autocomplete } from '@mui/material';
import { PyroscopeDatasourceSelector } from '../model';
import { useLabelNames, filterLabelNamesOptions } from '../utils/use-query';

export interface LabelNameProps {
  datasource: PyroscopeDatasourceSelector;
  value: string;
  onChange?(value: string): void;
}

export function LabelName(props: LabelNameProps): ReactElement {
  const { datasource, value, onChange } = props;

  const { data: labelNamesOptions, isLoading: isLabelNamesOptionsLoading } = useLabelNames(datasource);

  const filteredLabelNamesOptions = useMemo(
    () => filterLabelNamesOptions(labelNamesOptions?.names ?? []),
    [labelNamesOptions]
  );

  return (
    <Autocomplete
      disableClearable
      options={filteredLabelNamesOptions}
      value={value}
      sx={(theme) => ({
        width: '100%',
        '& .MuiOutlinedInput-root': {
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          [theme.breakpoints.down('sm')]: {
            borderBottomLeftRadius: 0,
          },
        },
      })}
      loading={isLabelNamesOptionsLoading}
      renderInput={(params) => {
        return <TextField {...params} placeholder="Select label name" size="small" />;
      }}
      onChange={(_event, newValue) => {
        if (newValue !== null) {
          onChange?.(newValue);
        }
      }}
    />
  );
}
