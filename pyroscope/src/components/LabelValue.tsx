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
import { TextField, Autocomplete } from '@mui/material';
import { PyroscopeDatasourceSelector } from '../model';
import { useLabelValues } from '../utils/use-query';

export interface LabelValueProps {
  datasource: PyroscopeDatasourceSelector;
  value: string;
  labelName: string;
  onChange?(value: string): void;
}

export function LabelValue(props: LabelValueProps): ReactElement {
  const { datasource, value, labelName, onChange } = props;

  const { data: labelValuesOptions, isLoading: isLabelValuesOptionsLoading } = useLabelValues(datasource, labelName);

  return (
    <Autocomplete
      freeSolo
      disableClearable
      options={labelValuesOptions?.names ?? []}
      value={value}
      sx={(theme) => ({
        width: '100%',
        '& .MuiOutlinedInput-root': {
          borderRadius: 0,
          width: '100%',
          [theme.breakpoints.down('sm')]: {
            borderBottomLeftRadius: 4,
          },
        },
      })}
      loading={isLabelValuesOptionsLoading}
      renderInput={(params) => {
        return <TextField {...params} placeholder="Select label value" size="small" />;
      }}
      onChange={(_event, newInputValue) => {
        if (newInputValue !== null) {
          onChange?.(newInputValue);
        }
      }}
    />
  );
}
