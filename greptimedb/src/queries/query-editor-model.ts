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

import { produce } from 'immer';
import { useState } from 'react';

type QuerySpec = {
  query: string;
};

/**
 * A hook for managing the `query` state in GreptimeDB query specs. Returns the `query` value, along with
 * `onChange` and `onBlur` event handlers to the input. Keeps a local copy of the user's input and only syncs those
 * changes with the overall spec value once the input is blurred to prevent re-running queries in the panel's preview
 * every time the user types.
 */
export function useQueryState<T extends QuerySpec>(props: {
  value: T;
  onChange: (next: T) => void;
}): {
  query: string;
  handleQueryChange: (e: string) => void;
  handleQueryBlur: () => void;
} {
  const { onChange, value } = props;

  const [query, setQuery] = useState(value.query || '');
  const [lastSyncedQuery, setLastSyncedQuery] = useState(value.query);

  if (value.query !== lastSyncedQuery) {
    setQuery(value.query || '');
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
