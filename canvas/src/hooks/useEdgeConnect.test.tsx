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
import { useEdgeConnect } from './useEdgeConnect';

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

describe('useEdgeConnect', () => {
  it('dragEdge is null initially', () => {
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper() });
    expect(result.current.dragEdge).toBeNull();
  });

  it('beginEdgeDrag sets dragEdge', async () => {
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper() });
    await act(async () => {
      result.current.beginEdgeDrag('a', 'n', 10, 20);
    });
    expect(result.current.dragEdge).toMatchObject({ sourceId: 'a', sourceAnchor: 'n', x1: 10, y1: 20, x2: 10, y2: 20 });
  });

  it('resetEdgeDrag clears dragEdge', async () => {
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper() });
    await act(async () => {
      result.current.beginEdgeDrag('a', 'n', 0, 0);
    });
    await act(async () => {
      result.current.resetEdgeDrag();
    });
    expect(result.current.dragEdge).toBeNull();
  });

  it('applyEdgeDrag creates a new free-endpoint edge when not snapped', async () => {
    const spec: CanvasSpec = { nodes: [makeNode('a', 0, 0)] };
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.beginEdgeDrag('a', 'e', 50, 0);
    });
    const draft = produce({ ...spec, edges: [] as CanvasSpec['edges'] }, (d) => {
      if (result.current.dragEdge) {
        result.current.dragEdge.x2 = 300;
        result.current.dragEdge.y2 = 300;
      }
      result.current.applyEdgeDrag(d);
    });
    expect(draft.edges?.length).toBe(1);
    expect(draft.edges?.[0]?.source).toBe('a');
    expect(draft.edges?.[0]?.target).toBe('');
    expect(draft.edges?.[0]?.x2).toBe(300);
  });

  it('applyEdgeDrag creates a node-connected edge when snapped', async () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 200, 0)];
    const spec: CanvasSpec = { nodes };
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.beginEdgeDrag('a', 'e', 50, 0);
    });
    const draft = produce({ ...spec, edges: [] as CanvasSpec['edges'] }, (d) => {
      if (result.current.dragEdge) {
        result.current.dragEdge.x2 = 150;
        result.current.dragEdge.y2 = 0;
        result.current.dragEdge.snapTargetId = 'b';
        result.current.dragEdge.snapTargetAnchor = 'w';
      }
      result.current.applyEdgeDrag(d);
    });
    expect(draft.edges?.[0]?.target).toBe('b');
    expect(draft.edges?.[0]?.targetAnchor).toBe('w');
    expect(draft.edges?.[0]?.x2).toBeUndefined();
  });

  it('beginEndpointDrag returns false for unknown edge id', async () => {
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper() });
    let ok = true;
    await act(async () => {
      ok = result.current.beginEndpointDrag(makeCircleEvent(), 'no-such-edge', 'target', 0, 0, 'src', 'n');
    });
    expect(ok).toBe(false);
  });

  it('beginEndpointDrag sets dragEdge for an existing edge', async () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 200, 0)];
    const edges = [{ id: 'e1', source: 'a', target: 'b', sourceAnchor: 'e' as const, targetAnchor: 'w' as const }];
    const spec: CanvasSpec = { nodes, edges };
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper(spec) });
    let ok = false;
    await act(async () => {
      ok = result.current.beginEndpointDrag(makeCircleEvent(), 'e1', 'target', 50, 0, 'a', 'e');
    });
    expect(ok).toBe(true);
    expect(result.current.dragEdge?.editingEdgeId).toBe('e1');
    expect(result.current.dragEdge?.editingEnd).toBe('target');
  });

  it('applyEdgeDrag reconnects target when editingEnd is target', async () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 200, 0), makeNode('c', 0, 200)];
    const edges = [{ id: 'e1', source: 'a', target: 'b', sourceAnchor: 'e' as const, targetAnchor: 'w' as const }];
    const spec: CanvasSpec = { nodes, edges };
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper(spec) });
    await act(async () => {
      result.current.beginEndpointDrag(makeCircleEvent(), 'e1', 'target', 50, 0, 'a', 'e');
    });
    const draft = produce(spec, (d) => {
      if (result.current.dragEdge) {
        result.current.dragEdge.snapTargetId = 'c';
        result.current.dragEdge.snapTargetAnchor = 'n';
      }
      result.current.applyEdgeDrag(d);
    });
    expect(draft.edges?.[0]?.target).toBe('c');
    expect(draft.edges?.[0]?.targetAnchor).toBe('n');
  });

  it('applyEdgeDrag is a no-op when dragEdge is null', () => {
    const spec: CanvasSpec = { edges: [{ id: 'e1', source: 'a', target: 'b' }] };
    const { result } = renderHook(() => useEdgeConnect(), { wrapper: makeWrapper(spec) });
    const draft = produce(spec, (d) => result.current.applyEdgeDrag(d));
    expect(draft).toEqual(spec);
  });
});
