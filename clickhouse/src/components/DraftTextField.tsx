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
import type { ReactElement } from 'react';

import { useDraftText } from './use-draft-text';

export type DraftTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange' | 'onBlur'> & {
  value: string | undefined;
  /** Called with the edited text when the field loses the focus, or on Enter. */
  onChange: (next: string) => void;
  isReadonly?: boolean;
};

/** DraftTextField is a text field that saves its value when it loses the focus rather than on every keystroke. */
export function DraftTextField(props: DraftTextFieldProps): ReactElement {
  const { value, onChange, isReadonly, slotProps, ...textFieldProps } = props;
  const { draft, setDraft, commit } = useDraftText(value, onChange);

  return (
    <TextField
      size="small"
      fullWidth
      {...textFieldProps}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
      slotProps={{
        ...slotProps,
        input: { readOnly: isReadonly, ...slotProps?.input },
        // A placeholder is only visible under a label that stays above the field.
        inputLabel: { ...(textFieldProps.placeholder ? { shrink: true } : undefined), ...slotProps?.inputLabel },
      }}
    />
  );
}
