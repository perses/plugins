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

import { Checkbox } from '@mui/material';
import type { MouseEvent, ReactElement } from 'react';
import { useCallback, useMemo } from 'react';

export interface SpanCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  'aria-label': string;
}

/**
 * SpanCheckbox renders a compact checkbox to select spans, fitting in the gantt table rows.
 */
export function SpanCheckbox(props: SpanCheckboxProps): ReactElement {
  const { checked, indeterminate, onChange, 'aria-label': ariaLabel } = props;
  const inputProps = useMemo(() => ({ 'aria-label': ariaLabel }), [ariaLabel]);
  // MUI only renders the indeterminate icon: the native property exposes the mixed state to assistive technology
  const inputRef = useCallback(
    (input: HTMLInputElement | null) => {
      if (input) input.indeterminate = indeterminate ?? false;
    },
    [indeterminate],
  );

  return (
    <Checkbox
      size="small"
      checked={checked}
      indeterminate={indeterminate}
      onChange={onChange}
      onClick={stopPropagation}
      inputProps={inputProps}
      inputRef={inputRef}
      sx={checkboxSx}
    />
  );
}

/** clicking the checkbox must not open the span in the detail pane */
function stopPropagation(e: MouseEvent): void {
  e.stopPropagation();
}

/** the default padding of a small checkbox exceeds the height of a gantt table row */
const checkboxSx = { padding: 0.5 } as const;
