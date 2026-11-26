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

import { createModEnterHandler } from '@perses-dev/dashboards';
import type { ReactElement } from 'react';

import { ClickQLEditor } from './ClickQLEditor';
import { useDraftText } from './use-draft-text';

export interface SQLFieldProps {
  label: string;
  value: string | undefined;
  /** Called with the edited statement when the editor loses the focus, or on Ctrl/Cmd + Enter. */
  onChange: (next: string) => void;
  placeholder?: string;
  isReadonly?: boolean;
}

/** SQLField edits a SQL statement of a query spec. */
export function SQLField(props: SQLFieldProps): ReactElement {
  const { label, value, onChange, placeholder, isReadonly } = props;
  const { draft, setDraft, commit } = useDraftText(value, onChange);

  return (
    <ClickQLEditor
      label={label}
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={createModEnterHandler(commit)}
      placeholder={placeholder}
      readOnly={isReadonly}
    />
  );
}
