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

import { useState } from 'react';

export interface DraftText {
  /** Text being edited. */
  draft: string;
  setDraft: (next: string) => void;
  /** Saves the draft, when it differs from the saved text. */
  commit: () => void;
}

/**
 * useDraftText keeps a local copy of a text of a spec while it is edited, and only saves it when asked to: on blur
 * or on demand. Saving on every keystroke would run the query of a panel preview again and again.
 */
export function useDraftText(saved: string | undefined, onCommit: (next: string) => void): DraftText {
  const [draft, setDraft] = useState(saved ?? '');

  // When the spec changes outside of this editor, show its new text.
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setDraft(saved ?? '');
    setLastSaved(saved);
  }

  const commit = (): void => {
    if (draft !== (saved ?? '')) {
      setLastSaved(draft);
      onCommit(draft);
    }
  };

  return { draft, setDraft, commit };
}
