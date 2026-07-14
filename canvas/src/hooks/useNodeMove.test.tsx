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

import { act, renderHook } from '@testing-library/react';
import { produce } from 'immer';
import React from 'react';
import { CanvasSpec, NodeSpec } from '../model';
import { makeWrapper } from '../test-utils/hookWrapper';
import { useEditorContext } from '../contexts/EditorContext';
import { useNodeMove } from './useNodeMove';

function makeNode(id: string, x: number, y: number): NodeSpec {
  return { id, x, y, width: 40, height: 40, kind: 'rectangle' };
}

function makePointerEvent(overrides: Partial<PointerEvent> = {}): React.PointerEvent<SVGRectElement> {
  return {
    buttons: 1,
    movementX: 0,
    movementY: 0,
    pointerId: 1,
    stopPropagation: jest.fn(),
    currentTarget: { setPointerCapture: jest.fn() },
    ...overrides,
  } as unknown as React.PointerEvent<SVGRectElement>;
}

function useTestHook(): { editor: ReturnType<typeof useEditorContext>; move: ReturnType<typeof useNodeMove> } {
  return { editor: useEditorContext(), move: useNodeMove() };
}

describe('useNodeMove', () => {
  it('applyMove is a no-op when no drag is active', () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 100, 100)] };
    const { result } = renderHook(() => useNodeMove(), { wrapper: makeWrapper(spec) });
    const draft = produce(spec, (d) => result.current.applyMove(d));
    expect(draft.nodes?.[0]?.x).toBe(100);
  });

  it('selectNode returns the id when the node is not selected', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 0, 0)] };
    const { result } = renderHook(() => useNodeMove(), { wrapper: makeWrapper(spec) });
    let returned: string | null = null;
    await act(async () => {
      returned = result.current.selectNode(makePointerEvent(), 'a');
    });
    expect(returned).toBe('a');
  });

  it('selectNode returns null when the node is already selected', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 10, 20)] };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a']));
    });
    let returned: string | null = 'not-set';
    await act(async () => {
      returned = result.current.move.selectNode(makePointerEvent(), 'a');
    });
    expect(returned).toBeNull();
  });

  it('applyMove translates nodes by accumulated delta', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 10, 20)] };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a']));
    });
    await act(async () => {
      result.current.move.selectNode(makePointerEvent(), 'a');
    });
    await act(async () => {
      result.current.move.updateMove(makePointerEvent({ movementX: 5, movementY: 3 }), 'a');
    });
    await act(async () => {
      result.current.move.updateMove(makePointerEvent({ movementX: 5, movementY: 3 }), 'a');
    });
    const draft = produce(spec, (d) => result.current.move.applyMove(d));
    expect(draft.nodes?.[0]?.x).toBeCloseTo(20);
    expect(draft.nodes?.[0]?.y).toBeCloseTo(26);
  });

  it('applyMove also translates free edge endpoints', async () => {
    const spec: CanvasSpec = {
      nodes: [makeNode('a', 0, 0)],
      edges: [{ id: 'e1', source: 'a', target: '', x2: 50, y2: 50 }],
    };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a', 'e1']));
    });
    await act(async () => {
      result.current.move.selectNode(makePointerEvent(), 'a');
    });
    await act(async () => {
      result.current.move.updateMove(makePointerEvent({ movementX: 10, movementY: 10 }), 'a');
    });
    const draft = produce(spec, (d) => result.current.move.applyMove(d));
    expect(draft.edges?.[0]?.x2).toBeCloseTo(60);
    expect(draft.edges?.[0]?.y2).toBeCloseTo(60);
  });

  it('resetMove clears the drag so applyMove becomes a no-op', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 0, 0)] };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a']));
    });
    await act(async () => {
      result.current.move.selectNode(makePointerEvent(), 'a');
    });
    await act(async () => {
      result.current.move.updateMove(makePointerEvent({ movementX: 99, movementY: 99 }), 'a');
    });
    await act(async () => {
      result.current.move.resetMove();
    });
    const draft = produce(spec, (d) => result.current.move.applyMove(d));
    expect(draft.nodes?.[0]?.x).toBe(0);
  });
});
