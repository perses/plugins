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

import { TextField } from '@mui/material';
import { ChangeEvent, ReactElement, useCallback, useEffect, useState } from 'react';

export interface LazyTextFieldProps {
  label: string;
  value?: string;
  onCommit: (nextValue: string) => void;
  placeholder?: string;
  helperText?: string;
  multiline?: boolean;
  minRows?: number;
}

export function LazyTextField(props: LazyTextFieldProps): ReactElement {
  const { value, onCommit, ...textFieldProps } = props;
  const [draftValue, setDraftValue] = useState(value ?? '');

  useEffect(() => {
    setDraftValue(value ?? '');
  }, [value]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setDraftValue(event.target.value);
  }, []);

  const handleBlur = useCallback((): void => {
    onCommit(draftValue);
  }, [draftValue, onCommit]);

  return <TextField {...textFieldProps} size="small" value={draftValue} onChange={handleChange} onBlur={handleBlur} />;
}
