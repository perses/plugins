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
import React from 'react';
import { NodeSpec } from '../model';
import { makeWrapper } from '../test-utils/hookWrapper';
import { useRectSelect } from './useRectSelect';

function makeNode(id: string, x: number, y: number): NodeSpec {
  return { id, x, y, width: 10, height: 10, kind: 'rectangle' };
}

function makePointerEvent(
  x: number,
  y: number,
  overrides: Partial<PointerEvent> = {}
): React.PointerEvent<SVGSVGElement> {
  return {
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    pointerId: 1,
    target: document.createElement('svg'),
    currentTarget: { focus: jest.fn(), setPointerCapture: jest.fn() },
    stopPropagation: jest.fn(),
    ...overrides,
  } as unknown as React.PointerEvent<SVGSVGElement>;
}

describe('useRectSelect', () => {
  it('begins with no selection rect', () => {
    const { result } = renderHook(() => useRectSelect(), { wrapper: makeWrapper() });
    expect(result.current.selectionRect).toBeNull();
  });

  it('beginSelection sets the selection rect', async () => {
    const { result } = renderHook(() => useRectSelect(), { wrapper: makeWrapper() });
    await act(async () => {
      result.current.beginSelection(makePointerEvent(10, 20));
    });
    expect(result.current.selectionRect).toEqual({ x0: 10, y0: 20, x1: 10, y1: 20 });
  });

  it('updateSelection extends the rect', async () => {
    const { result } = renderHook(() => useRectSelect(), { wrapper: makeWrapper() });
    await act(async () => {
      result.current.beginSelection(makePointerEvent(10, 20));
    });
    await act(async () => {
      result.current.updateSelection(makePointerEvent(50, 60));
    });
    expect(result.current.selectionRect).toEqual({ x0: 10, y0: 20, x1: 50, y1: 60 });
  });

  it('applySelection returns ids of nodes inside the rect and clears it', async () => {
    const nodes = [makeNode('a', 20, 30), makeNode('b', 200, 200)];
    const { result } = renderHook(() => useRectSelect(), { wrapper: makeWrapper({ nodes }) });
    await act(async () => {
      result.current.beginSelection(makePointerEvent(0, 0));
    });
    await act(async () => {
      result.current.updateSelection(makePointerEvent(100, 100));
    });
    let ids!: Set<string>;
    await act(async () => {
      ids = result.current.applySelection();
    });
    expect(ids).toEqual(new Set(['a']));
    expect(result.current.selectionRect).toBeNull();
  });

  it('beginSelection returns false for pan gesture (button=1)', async () => {
    const { result } = renderHook(() => useRectSelect(), { wrapper: makeWrapper() });
    let started = false;
    await act(async () => {
      started = result.current.beginSelection(makePointerEvent(0, 0, { button: 1 }));
    });
    expect(started).toBe(false);
    expect(result.current.selectionRect).toBeNull();
  });
});
