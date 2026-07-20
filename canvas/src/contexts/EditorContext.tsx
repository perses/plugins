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

import { createContext, ReactElement, ReactNode, useContext, useReducer } from 'react';
import { EditorState, editorReducer, INITIAL_EDITOR_STATE } from '../utils/editorReducer';

export interface EditorContextValue {
  state: EditorState;
  selectItems: (ids: Set<string>) => void;
  clearSelection: () => void;
  hoverNode: (id: string) => void;
  unhoverNode: (id: string) => void;
  startSelectionRect: () => void;
  startMove: () => void;
  startDragEdge: () => void;
  startResize: () => void;
  endInteraction: () => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditorContext must be used inside an EditorStateProvider');
  }
  return ctx;
}

export function EditorStateProvider({ children }: { children: ReactNode }): ReactElement {
  const [state, dispatch] = useReducer(editorReducer, INITIAL_EDITOR_STATE);

  return (
    <EditorContext.Provider
      value={{
        state,
        selectItems: (ids) => dispatch({ type: 'SELECT_ITEMS', ids }),
        clearSelection: () => dispatch({ type: 'CLEAR_SELECTION' }),
        hoverNode: (id) => dispatch({ type: 'HOVER_NODE', id }),
        unhoverNode: (id) => dispatch({ type: 'UNHOVER_NODE', id }),
        startSelectionRect: () => dispatch({ type: 'SELECTION_RECT_START' }),
        startMove: () => dispatch({ type: 'MOVE_START' }),
        startDragEdge: () => dispatch({ type: 'DRAG_EDGE_START' }),
        startResize: () => dispatch({ type: 'RESIZE_START' }),
        endInteraction: () => dispatch({ type: 'INTERACTION_END' }),
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
