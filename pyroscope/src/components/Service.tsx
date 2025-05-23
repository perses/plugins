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
import { InputLabel, Stack, useTheme, Select, MenuItem } from '@mui/material';
import { PyroscopeClient } from '../model';

export interface ServiceProps {
  client: PyroscopeClient | undefined;
  value: string;
  onChange?(value: string): void;
}

async function fetchServices(client: PyroscopeClient): Promise<string[]> {
  const response = await client.searchServices(
    {}, //param
    { 'content-type': 'application/json' } // headers
  );
  return response.names;
}

export function Service(props: ServiceProps): ReactElement {
  const theme = useTheme();
  const { client, value, onChange } = props;

  const [options, setOptions] = useState<ReactElement[]>([]);

  // update options when the client changes
  useEffect(() => {
    const updateOptions = async () => {
      if (client) {
        const services = await fetchServices(client);
        const menuItems = services.map((service) => (
          <MenuItem key={service} value={service}>
            {service}
          </MenuItem>
        ));
        setOptions(menuItems);
      }
    };

    updateOptions().catch((error) => {
      console.error('Failed to fetch services:', error);
    });
  }, [client]);

  return (
    <Stack position="relative" sx={{ flexGrow: 1 }}>
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
        Service
      </InputLabel>
      <Select value={value} size="small" onChange={(event) => onChange?.(event.target.value)}>
        {options.length > 0 && options}
      </Select>
    </Stack>
  );
}
