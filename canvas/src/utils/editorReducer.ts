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

export type EditorMode =
  { type: 'idle' } | { type: 'selecting' } | { type: 'moving' } | { type: 'dragging-edge' } | { type: 'resizing' };

export interface EditorState {
  mode: EditorMode;
  selectedIds: Set<string>;
  hoveredId: string | null;
}

export const INITIAL_EDITOR_STATE: EditorState = {
  mode: { type: 'idle' },
  selectedIds: new Set(),
  hoveredId: null,
};

export type EditorAction =
  | { type: 'SELECT_ITEMS'; ids: Set<string> }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'HOVER_NODE'; id: string }
  | { type: 'UNHOVER_NODE'; id: string }
  | { type: 'SELECTION_RECT_START' }
  | { type: 'MOVE_START' }
  | { type: 'DRAG_EDGE_START' }
  | { type: 'RESIZE_START' }
  | { type: 'INTERACTION_END' };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SELECT_ITEMS': {
      return { ...state, selectedIds: action.ids };
    }
    case 'CLEAR_SELECTION': {
      return { ...state, selectedIds: new Set() };
    }
    case 'HOVER_NODE': {
      return { ...state, hoveredId: action.id };
    }
    case 'UNHOVER_NODE': {
      return { ...state, hoveredId: state.hoveredId === action.id ? null : state.hoveredId };
    }
    case 'SELECTION_RECT_START': {
      return { ...state, selectedIds: new Set(), mode: { type: 'selecting' } };
    }
    case 'MOVE_START': {
      return { ...state, mode: { type: 'moving' } };
    }
    case 'DRAG_EDGE_START': {
      return { ...state, mode: { type: 'dragging-edge' }, hoveredId: null };
    }
    case 'RESIZE_START': {
      return { ...state, mode: { type: 'resizing' } };
    }
    case 'INTERACTION_END': {
      return { ...state, mode: { type: 'idle' } };
    }
    default: {
      return state;
    }
  }
}
