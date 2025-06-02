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
import { InputLabel, Stack, useTheme, Select, MenuItem } from '@mui/material';
import { PyroscopeDatasourceSelector } from '../model';
import { useServices } from './utils';

export interface ServiceProps {
  datasource: PyroscopeDatasourceSelector;
  value: string;
  onChange?(value: string): void;
}

export function Service(props: ServiceProps): ReactElement {
  const theme = useTheme();
  const { datasource, value, onChange } = props;

  const { data: servicesOptions } = useServices(datasource);

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
        {servicesOptions?.names &&
          servicesOptions?.names.map((service) => (
            <MenuItem key={service} value={service}>
              {service}
            </MenuItem>
          ))}
      </Select>
    </Stack>
  );
}
