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
import { useEditorContext } from '../contexts/EditorContext';
import { makeWrapper } from '../test-utils/hookWrapper';
import { useResize } from './useResize';

function makeNode(id: string, x: number, y: number, width = 100, height = 60): NodeSpec {
  return { id, x, y, width, height, kind: 'rectangle' };
}

function makeCircleEvent(overrides: Partial<PointerEvent> = {}): React.PointerEvent<SVGCircleElement> {
  return {
    pointerId: 1,
    stopPropagation: jest.fn(),
    currentTarget: { setPointerCapture: jest.fn() },
    ...overrides,
  } as unknown as React.PointerEvent<SVGCircleElement>;
}

function makeSvgEvent(x: number, y: number): React.PointerEvent<SVGSVGElement> {
  return { clientX: x, clientY: y } as unknown as React.PointerEvent<SVGSVGElement>;
}

function useTestHook(): { editor: ReturnType<typeof useEditorContext>; resize: ReturnType<typeof useResize> } {
  return { editor: useEditorContext(), resize: useResize() };
}

describe('useResize', () => {
  it('applyResize is a no-op when no drag is active', () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 0, 0)] };
    const { result } = renderHook(() => useResize(), { wrapper: makeWrapper(spec) });
    const draft = produce(spec, (d) => result.current.applyResize(d));
    expect(draft).toEqual(spec);
  });

  it('beginResize returns false when selection is empty', async () => {
    const { result } = renderHook(() => useResize(), { wrapper: makeWrapper() });
    let ok = true;
    await act(async () => {
      ok = result.current.beginResize(makeCircleEvent(), 'se');
    });
    expect(ok).toBe(false);
  });

  it('beginResize returns true when nodes are selected', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 0, 0)] };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a']));
    });
    let ok = false;
    await act(async () => {
      ok = result.current.resize.beginResize(makeCircleEvent(), 'se');
    });
    expect(ok).toBe(true);
  });

  it('applyResize scales node position and size', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 50, 30, 100, 60)] };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a']));
    });
    await act(async () => {
      result.current.resize.beginResize(makeCircleEvent() as React.PointerEvent<SVGCircleElement>, 'se');
    });
    await act(async () => {
      result.current.resize.updateResize(makeSvgEvent(200, 120));
    });
    const draft = produce(spec, (d) => result.current.resize.applyResize(d));
    const node = draft.nodes?.[0];
    expect(node?.width).toBeCloseTo(200);
    expect(node?.height).toBeCloseTo(120);
    expect(node?.x).toBeCloseTo(100);
    expect(node?.y).toBeCloseTo(60);
  });

  it('applyResize also scales free edge endpoints', async () => {
    const spec: CanvasSpec = {
      nodes: [makeNode('a', 50, 30, 100, 60)],
      edges: [{ id: 'e1', source: 'a', target: '', x2: 100, y2: 60 }],
    };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a', 'e1']));
    });
    await act(async () => {
      result.current.resize.beginResize(makeCircleEvent(), 'se');
    });
    await act(async () => {
      result.current.resize.updateResize(makeSvgEvent(200, 120));
    });
    const draft = produce(spec, (d) => result.current.resize.applyResize(d));
    expect(draft.edges?.[0]?.x2).toBeCloseTo(200);
    expect(draft.edges?.[0]?.y2).toBeCloseTo(120);
  });

  it('resetResize makes applyResize a no-op', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 50, 30, 100, 60)] };
    const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.editor.selectItems(new Set(['a']));
    });
    await act(async () => {
      result.current.resize.beginResize(makeCircleEvent(), 'se');
    });
    await act(async () => {
      result.current.resize.updateResize(makeSvgEvent(200, 120));
    });
    await act(async () => {
      result.current.resize.resetResize();
    });
    const draft = produce(spec, (d) => result.current.resize.applyResize(d));
    expect(draft.nodes?.[0]?.width).toBe(100);
  });
});
