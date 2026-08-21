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

import { createContext, ReactElement, ReactNode, useCallback, useContext, useMemo, useReducer } from 'react';

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

  const selectItems = useCallback((ids: Set<string>) => dispatch({ type: 'SELECT_ITEMS', ids }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);
  const hoverNode = useCallback((id: string) => dispatch({ type: 'HOVER_NODE', id }), []);
  const unhoverNode = useCallback((id: string) => dispatch({ type: 'UNHOVER_NODE', id }), []);
  const startSelectionRect = useCallback(() => dispatch({ type: 'SELECTION_RECT_START' }), []);
  const startMove = useCallback(() => dispatch({ type: 'MOVE_START' }), []);
  const startDragEdge = useCallback(() => dispatch({ type: 'DRAG_EDGE_START' }), []);
  const startResize = useCallback(() => dispatch({ type: 'RESIZE_START' }), []);
  const endInteraction = useCallback(() => dispatch({ type: 'INTERACTION_END' }), []);

  const value = useMemo(
    () => ({
      state,
      selectItems,
      clearSelection,
      hoverNode,
      unhoverNode,
      startSelectionRect,
      startMove,
      startDragEdge,
      startResize,
      endInteraction,
    }),
    [
      state,
      selectItems,
      clearSelection,
      hoverNode,
      unhoverNode,
      startSelectionRect,
      startMove,
      startDragEdge,
      startResize,
      endInteraction,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
