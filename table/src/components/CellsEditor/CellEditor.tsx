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

import { Grid2Props as GridProps } from '@mui/material';
import { ReactElement } from 'react';
import { CellSettings } from '../../models';
import { ConditionalRule } from '../ConditionalPanel';

export interface CellEditorProps extends Omit<GridProps, 'onChange'> {
  cell: CellSettings;
  onChange: (cell: CellSettings) => void;
  onDelete: () => void;
}

export function CellEditor({ cell, onChange, onDelete, ...props }: CellEditorProps): ReactElement {
  return <ConditionalRule cell={cell} onChange={onChange} onDelete={onDelete} {...props} />;
}
