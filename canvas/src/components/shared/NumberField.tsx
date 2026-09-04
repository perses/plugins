// Copyright The Perses Authors
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

import type { TextFieldProps } from '@mui/material';
import { TextField } from '@mui/material';
import { combineSx } from '@perses-dev/components';
import type { ReactElement } from 'react';
import React, { useMemo } from 'react';

type NumberFieldProps = Omit<TextFieldProps, 'type' | 'slotProps'> & {
  min?: number;
  step?: number;
};

export function NumberField({ min, step, sx, ...props }: NumberFieldProps): ReactElement {
  const slotProps = useMemo(() => ({ htmlInput: { min, step } }), [min, step]);

  return <TextField size="small" type="number" sx={combineSx({ width: 80 }, sx)} slotProps={slotProps} {...props} />;
}
