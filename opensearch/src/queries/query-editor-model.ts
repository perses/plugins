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
import { produce } from 'immer';
import { OptionsEditorProps } from '@perses-dev/plugin-system';

type OpenSearchQuerySpec = {
  query: string;
};

/**
 * Keep a local copy of the query input so we don't re-run the panel preview on every keystroke.
 * Changes are propagated to the spec on blur.
 */
export function useQueryState<T extends OpenSearchQuerySpec>(
  props: OptionsEditorProps<T>
): {
  query: string;
  handleQueryChange: (e: string) => void;
  handleQueryBlur: () => void;
} {
  const { onChange, value } = props;

  const [query, setQuery] = useState(value.query);
  const [lastSyncedQuery, setLastSyncedQuery] = useState(value.query);
  if (value.query !== lastSyncedQuery) {
    setQuery(value.query);
    setLastSyncedQuery(value.query);
  }

  const handleQueryChange = (e: string): void => {
    setQuery(e);
  };

  const handleQueryBlur = (): void => {
    setLastSyncedQuery(query);
    onChange(
      produce(value, (draft) => {
        draft.query = query;
      })
    );
  };

  return { query, handleQueryChange, handleQueryBlur };
}
