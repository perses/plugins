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
import { Select, MenuItem } from '@mui/material';
import { PyroscopeClient } from '../model';
import { useLabelNames } from './utils';

export interface LabelNameProps {
  client: PyroscopeClient | undefined;
  value: string;
  onChange?(value: string): void;
}

export function LabelName(props: LabelNameProps): ReactElement {
  const { client, value, onChange } = props;

  const { data: labelNamesOptions } = useLabelNames(client);

  const regex = /^__.*__$/;

  return (
    <Select
      sx={{ borderTopRightRadius: '0', borderBottomRightRadius: '0' }}
      value={value}
      size="small"
      onChange={(event) => onChange?.(event.target.value)}
      displayEmpty
      renderValue={(selected) => {
        if (selected === '') {
          return 'Select label name';
        }
        return selected;
      }}
    >
      {labelNamesOptions?.names &&
        labelNamesOptions?.names
          .filter((labelName) => !regex.test(labelName) && labelName !== 'service_name')
          .map((labelName) => (
            <MenuItem key={labelName} value={labelName}>
              {labelName}
            </MenuItem>
          ))}
    </Select>
  );
}
