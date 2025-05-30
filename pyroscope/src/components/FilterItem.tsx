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

import { ReactElement, useState } from 'react';
import { Stack } from '@mui/material';
import { PyroscopeClient } from '../model';
import { LabelName } from './LabelName';
import { Operator } from './Operator';
import { LabelValue } from './LabelValue';
import { DeleteFilterItem } from './DeleteFilterItem';

export interface FilterItemProps {
  client: PyroscopeClient | undefined;
  value: string;
  onChange?: (value: string) => void;
  deleteItem?: () => void; // this function is used to delete the current filter
}

export function FilterItem(props: FilterItemProps): ReactElement {
  const { client, value, onChange, deleteItem } = props;

  const getSeparator = (value: string): string | null => {
    if (value === '') return null;
    if (value.includes('!=')) return '!=';
    if (value.includes('=~')) return '=~';
    if (value.includes('!~')) return '!~';
    if (value.includes('=')) return '=';
    console.warn('No valid operator found in value:', value);
    return null;
  };

  const [labelName, setLabelName] = useState(() => {
    const sep = getSeparator(value);
    return sep ? value.split(sep)[0] : '';
  });

  const [operator, setOperator] = useState(() => {
    return getSeparator(value) || '=';
  });

  const [labelValue, setLabelValue] = useState(() => {
    const sep = getSeparator(value);
    return sep ? value.split(sep)[1].slice(1, -1) : '';
  });

  // update the filterItem value when one of its children changes
  const handleFilterItemValueChange = (labelName: string, operator: string, labelValue: string) => {
    const newValue = labelName + operator + '"' + labelValue + '"';

    if (labelName !== '' && operator !== '' && labelValue !== '' && newValue !== value) {
      onChange?.(newValue);
    }
  };

  const handleLabelNameChange = (name: string) => {
    if (labelValue !== '') {
      setLabelValue('');
      onChange?.('');
    }
    setLabelName(name);
  };

  const handleOperatorChange = (op: string) => {
    setOperator(op);
    handleFilterItemValueChange(labelName, op, labelValue);
  };

  const handleLabelValueChange = (value: string) => {
    setLabelValue(value);
    handleFilterItemValueChange(labelName, operator, value);
  };

  const handleDeleteClick = () => {
    deleteItem?.();
  };

  return (
    <Stack direction="row" spacing={0}>
      <LabelName client={client} value={labelName} onChange={handleLabelNameChange} />
      <Operator value={operator} onChange={handleOperatorChange} />
      <LabelValue client={client} value={labelValue} labelName={labelName} onChange={handleLabelValueChange} />
      <DeleteFilterItem onClick={handleDeleteClick} />
    </Stack>
  );
}
