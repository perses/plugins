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

import { StackProps, Switch, TextField } from '@mui/material';
import { ReactElement, useState } from 'react';
import {
  AlignSelector,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
  SortSelectorButtons,
} from '@perses-dev/components';
import { ColumnSettings } from '../table-model';

type OmittedMuiProps = 'children' | 'value' | 'onChange';

export interface ColumnEditorProps extends Omit<StackProps, OmittedMuiProps> {
  column: ColumnSettings;
  onChange: (column: ColumnSettings) => void;
}

export function ColumnEditor({ column, onChange, ...others }: ColumnEditorProps): ReactElement {
  const [width, setWidth] = useState<number>(
    column.width === undefined || column.width === 'auto' ? 100 : column.width
  );

  return (
    <OptionsEditorGrid {...others}>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Column">
          <OptionsEditorControl
            label="Name*"
            control={
              <TextField value={column.name} onChange={(e) => onChange({ ...column, name: e.target.value })} required />
            }
          />
          <OptionsEditorControl
            label="Header"
            control={
              <TextField
                value={column.header ?? ''}
                onChange={(e) => onChange({ ...column, header: e.target.value ? e.target.value : undefined })}
              />
            }
          />
          <OptionsEditorControl
            label="Header Tooltip"
            control={
              <TextField
                value={column.headerDescription ?? ''}
                onChange={(e) =>
                  onChange({ ...column, headerDescription: e.target.value ? e.target.value : undefined })
                }
              />
            }
          />
          <OptionsEditorControl
            label="Cell Tooltip"
            control={
              <TextField
                value={column.cellDescription ?? ''}
                onChange={(e) => onChange({ ...column, cellDescription: e.target.value ? e.target.value : undefined })}
              />
            }
          />
          <OptionsEditorControl
            label="Enable sorting"
            control={
              <Switch
                checked={column.enableSorting ?? false}
                onChange={(e) => onChange({ ...column, enableSorting: e.target.checked })}
              />
            }
          />
          {column.enableSorting && (
            <OptionsEditorControl
              label="Default Sort"
              control={
                <SortSelectorButtons
                  size="medium"
                  value={column.sort}
                  sx={{
                    margin: 0.5,
                  }}
                  onChange={(sort) => onChange({ ...column, sort: sort })}
                />
              }
            />
          )}
        </OptionsEditorGroup>
      </OptionsEditorColumn>

      <OptionsEditorColumn>
        <OptionsEditorGroup title="Visual">
          <OptionsEditorControl
            label="Show column"
            control={
              <Switch
                checked={!(column.hide ?? false)}
                onChange={(e) => onChange({ ...column, hide: !e.target.checked })}
              />
            }
          />
          <OptionsEditorControl
            label="Alignment"
            control={
              <AlignSelector
                size="small"
                value={column.align ?? 'left'}
                onChange={(align) => onChange({ ...column, align: align })}
              />
            }
          />
          <OptionsEditorControl
            label="Custom width"
            control={
              <Switch
                checked={column.width !== undefined && column.width !== 'auto'}
                onChange={(e) => onChange({ ...column, width: e.target.checked ? width : 'auto' })}
              />
            }
          />
          {column.width !== undefined && column.width !== 'auto' && (
            <OptionsEditorControl
              label="Width"
              control={
                <TextField
                  type="number"
                  value={width}
                  slotProps={{ htmlInput: { min: 1 } }}
                  onChange={(e) => {
                    setWidth(+e.target.value);
                    onChange({ ...column, width: +e.target.value });
                  }}
                />
              }
            />
          )}
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
