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

import type { SxProps, Theme } from '@mui/material';
import { Checkbox } from '@mui/material';
import type { MouseEvent, ReactElement } from 'react';
import { useMemo } from 'react';

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

  return (
    <Checkbox
      size="small"
      checked={checked}
      indeterminate={indeterminate}
      onChange={onChange}
      onClick={stopPropagation}
      inputProps={inputProps}
      sx={checkboxSx}
    />
  );
}

/** clicking the checkbox must not open the span in the detail pane */
function stopPropagation(e: MouseEvent): void {
  e.stopPropagation();
}

const checkboxSx: SxProps<Theme> = { padding: 0.25, marginX: 0.25, '& .MuiSvgIcon-root': { fontSize: 18 } };
