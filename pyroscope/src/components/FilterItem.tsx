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
import { Grid2 as Grid, Stack } from '@mui/material';
import { PyroscopeDatasourceSelector } from '../model';
import { LabelFilter, OperatorType } from '../utils/types';
import { LabelName } from './LabelName';
import { Operator } from './Operator';
import { LabelValue } from './LabelValue';
import { DeleteFilterItem } from './DeleteFilterItem';

export interface FilterItemProps {
  datasource: PyroscopeDatasourceSelector;
  value: LabelFilter;
  onChange?: (value: LabelFilter) => void;
  deleteItem?: () => void; // this function is used to delete the current filter
}

export function FilterItem(props: FilterItemProps): ReactElement {
  const { datasource, value, onChange, deleteItem } = props;

  const handleLabelNameChange = (label: string) => {
    onChange?.({ labelName: label, labelValue: '', operator: value.operator });
  };

  const handleOperatorChange = (op: OperatorType) => {
    onChange?.({ labelName: value.labelName, labelValue: value.labelValue, operator: op });
  };

  const handleLabelValueChange = (val: string) => {
    onChange?.({ labelName: value.labelName, labelValue: val, operator: value.operator });
  };

  const handleDeleteClick = () => {
    deleteItem?.();
  };

  return (
    <Stack
      direction="row"
      spacing={0}
      sx={(theme) => ({ flexWrap: 'wrap', width: 500, [theme.breakpoints.down('sm')]: { width: '100%' } })}
    >
      <Grid container sx={{ width: '100%' }}>
        <Grid size={{ xs: 9.5, md: 4.5 }}>
          <LabelName datasource={datasource} value={value.labelName} onChange={handleLabelNameChange} />
        </Grid>
        <Grid size={{ xs: 2.5, md: 1.5 }}>
          <Operator value={value.operator} onChange={handleOperatorChange} />
        </Grid>
        <Grid size={{ xs: 10, md: 5 }}>
          <LabelValue
            datasource={datasource}
            value={value.labelValue}
            labelName={value.labelName}
            onChange={handleLabelValueChange}
          />
        </Grid>
        <Grid size={{ xs: 2, md: 1 }}>
          <DeleteFilterItem onClick={handleDeleteClick} />
        </Grid>
      </Grid>
    </Stack>
  );
}
