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
import type { ChangeEvent, ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';

import type { CloudWatchDimensions } from '../model';

const MAX_DIMENSIONS = 30;

/**
 * Parses a JSON object of dimension names and values. Returns undefined when the text is not a valid object of
 * at most 30 non-empty string values.
 */
export function parseDimensions(text: string): CloudWatchDimensions | undefined {
  if (text.trim() === '') {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }
  const entries = Object.entries(parsed);
  if (
    entries.length > MAX_DIMENSIONS ||
    entries.some(([name, value]) => name === '' || typeof value !== 'string' || value === '')
  ) {
    return undefined;
  }
  return Object.fromEntries(entries) as CloudWatchDimensions;
}

export interface DimensionsEditorProps {
  label: string;
  value?: CloudWatchDimensions;
  onChange: (dimensions?: CloudWatchDimensions) => void;
  readOnly?: boolean;
}

export function DimensionsEditor({ label, value, onChange, readOnly }: DimensionsEditorProps): ReactElement {
  const [draft, setDraft] = useState(value && Object.keys(value).length > 0 ? JSON.stringify(value) : '');
  const [error, setError] = useState(false);
  const readOnlyProps = useMemo(() => ({ input: { readOnly } }), [readOnly]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setDraft(event.target.value);
      const dimensions = parseDimensions(event.target.value);
      setError(dimensions === undefined);
      if (dimensions !== undefined) {
        onChange(Object.keys(dimensions).length > 0 ? dimensions : undefined);
      }
    },
    [onChange],
  );

  return (
    <TextField
      label={label}
      value={draft}
      error={error}
      fullWidth
      slotProps={readOnlyProps}
      placeholder='{"InstanceId": "$instance"}'
      helperText={
        error
          ? 'Use a JSON object of at most 30 dimension names and non-empty string values. Invalid edits are not applied.'
          : 'JSON object of dimension names and values. Values can use dashboard variables.'
      }
      onChange={handleChange}
    />
  );
}
