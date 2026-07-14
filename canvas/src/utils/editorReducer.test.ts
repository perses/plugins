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

import { INITIAL_EDITOR_STATE, editorReducer, EditorState, EditorAction } from './editorReducer';

describe('editorReducer', () => {
  const state: EditorState = INITIAL_EDITOR_STATE;

  it('SELECT_ITEMS replaces selectedIds', () => {
    const ids = new Set(['a', 'b']);
    const next = editorReducer(state, { type: 'SELECT_ITEMS', ids });
    expect(next.selectedIds).toBe(ids);
  });

  it('CLEAR_SELECTION empties selectedIds', () => {
    const withSelection = { ...state, selectedIds: new Set(['a']) };
    const next = editorReducer(withSelection, { type: 'CLEAR_SELECTION' });
    expect(next.selectedIds.size).toBe(0);
  });

  it('HOVER_NODE sets hoveredId', () => {
    const next = editorReducer(state, { type: 'HOVER_NODE', id: 'x' });
    expect(next.hoveredId).toBe('x');
  });

  it('UNHOVER_NODE clears hoveredId when it matches', () => {
    const hovered = { ...state, hoveredId: 'x' };
    const next = editorReducer(hovered, { type: 'UNHOVER_NODE', id: 'x' });
    expect(next.hoveredId).toBeNull();
  });

  it('UNHOVER_NODE does not clear hoveredId when it does not match', () => {
    const hovered = { ...state, hoveredId: 'x' };
    const next = editorReducer(hovered, { type: 'UNHOVER_NODE', id: 'y' });
    expect(next.hoveredId).toBe('x');
  });

  it('SELECTION_RECT_START clears selection and sets selecting mode', () => {
    const withSelection = { ...state, selectedIds: new Set(['a']) };
    const next = editorReducer(withSelection, { type: 'SELECTION_RECT_START' });
    expect(next.mode).toEqual({ type: 'selecting' });
    expect(next.selectedIds.size).toBe(0);
  });

  it('MOVE_START sets moving mode', () => {
    expect(editorReducer(state, { type: 'MOVE_START' }).mode).toEqual({ type: 'moving' });
  });

  it('DRAG_EDGE_START sets dragging-edge mode and clears hoveredId', () => {
    const hovered = { ...state, hoveredId: 'x' };
    const next = editorReducer(hovered, { type: 'DRAG_EDGE_START' });
    expect(next.mode).toEqual({ type: 'dragging-edge' });
    expect(next.hoveredId).toBeNull();
  });

  it('RESIZE_START sets resizing mode', () => {
    expect(editorReducer(state, { type: 'RESIZE_START' }).mode).toEqual({ type: 'resizing' });
  });

  it('INTERACTION_END returns to idle mode', () => {
    const moving = { ...state, mode: { type: 'moving' as const } };
    expect(editorReducer(moving, { type: 'INTERACTION_END' }).mode).toEqual({ type: 'idle' });
  });

  it('unknown action returns state unchanged', () => {
    const next = editorReducer(state, { type: 'UNKNOWN' } as unknown as EditorAction);
    expect(next).toBe(state);
  });
});
