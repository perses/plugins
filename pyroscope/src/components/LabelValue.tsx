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

import { ReactElement, useEffect, useState } from 'react';
//import { useId } from '@perses-dev/components';
import { Select, MenuItem } from '@mui/material';
import { PyroscopeClient } from '../model';

export interface LabelValueProps {
  client: PyroscopeClient | undefined;
  value: string;
  labelName: string;
  onChange?(value: string): void;
}

async function fetchLabelValues(client: PyroscopeClient, labelName: string): Promise<string[]> {
  const response = await client.searchLabelValues(
    {}, //param
    { 'content-type': 'application/json' }, // headers
    { name: labelName } // body
  );
  return response.names;
}

export function LabelValue(props: LabelValueProps): ReactElement {
  const { client, value, labelName, onChange } = props;

  const [options, setOptions] = useState<ReactElement[]>([]);

  // update options when labelName changes
  useEffect(() => {
    const updateOptions = async () => {
      if (client && labelName) {
        const labelValues = await fetchLabelValues(client, labelName);
        const menuItems = labelValues.map((labelValue) => (
          <MenuItem key={labelValue} value={labelValue}>
            {labelValue}
          </MenuItem>
        ));
        setOptions(menuItems);

        // Reset selected value when labelName changes
        if (!labelValues.includes(value)) {
          onChange?.('');
        }
      }
    };

    updateOptions().catch((error) => {
      console.error('Failed to fetch label values:', error);
    });
  }, [client, labelName, onChange, value]);

  return (
    <Select
      sx={{ borderRadius: '0' }}
      value={value}
      size="small"
      onChange={(event) => onChange?.(event.target.value)}
      displayEmpty
      disabled={!labelName || labelName === ''} // Disabled if labelName is not defined yet
      renderValue={(selected) => {
        if (selected === '') {
          return 'Select label value';
        }
        return selected;
      }}
    >
      {options.length > 0 && options}
    </Select>
  );
}
