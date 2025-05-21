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

import { ReactElement, useState, useEffect } from 'react';
import { Stack } from '@mui/material';
import { PyroscopeClient } from '../model';
import { LabelName } from './LabelName';
import { Operator } from './Operator';
import { LabelValue } from './LabelValue';
import { DeleteFilterItem } from './DeleteFilterItem';

export interface FilterItemProps {
  client: PyroscopeClient | undefined;
  value: string;
  onChange?(value: string): void;
  deleteItem?(): void; // this function is used to delete the current filter
}

export function FilterItem(props: FilterItemProps): ReactElement {
  const { client, value, onChange, deleteItem } = props;

  const [labelName, setLabelName] = useState('');
  const [operator, setOperator] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const [isValueComplete, setIsValueComplete] = useState(false);

  // initialize states with the spec if needed
  useEffect(() => {
    const decomposeValue = () => {
      let sep = '';

      switch (true) {
        case value.includes('!='):
          sep = '!=';
          break;
        case value.includes('=~'):
          sep = '=~';
          break;
        case value.includes('!~'):
          sep = '!~';
          break;
        case value.includes('='):
          sep = '=';
          break;
        default:
          console.warn('No valid operator found in value:', value);
          break;
      }

      if (sep !== '') {
        setLabelName(value.split(sep)[0]);
        setOperator(sep);
        setLabelValue(value.split(sep)[1].slice(1, -1));
      }
    };

    if (value !== '') {
      decomposeValue();
    }
  }, [value]);

  // update the filterItem value when one of his children change
  useEffect(() => {
    // const newValue = isValueComplete ? labelName + operator + '"' + labelValue + '"' : '';
    // if (labelName !== '' && operator !== '' && labelValue !== '') {
    //   setIsValueComplete(true);
    // }

    const newValue = labelName + operator + '"' + labelValue + '"';

    if (labelName !== '' && operator !== '' && labelValue !== '' && newValue !== value) {
      onChange?.(newValue);
    }
  }, [labelName, operator, labelValue, onChange, value]);

  const handleLabelNameChange = (name: string) => {
    setIsValueComplete(false);
    if (labelValue !== '') {
      setLabelValue('');
    }
    setLabelName(name);
  };

  const handleOperatorChange = (op: string) => {
    setOperator(op);
  };

  const handleLabelValueChange = (value: string) => {
    setLabelValue(value);
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
