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
import React, { ReactNode, useState } from 'react';
import { BackgroundSpec, CanvasSpec } from '../model';
import { EditorStateProvider, useEditorContext } from './EditorContext';
import { SpecProvider, useSpecContext } from './SpecContext';

function useTestHook(): { spec: ReturnType<typeof useSpecContext>; editor: ReturnType<typeof useEditorContext> } {
  return { spec: useSpecContext(), editor: useEditorContext() };
}

function makeBackground(id: string, x = 0, y = 0, width = 100, height = 50): BackgroundSpec {
  return { id, x, y, width, height };
}

function makeWrapper(initialSpec: CanvasSpec) {
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    const [spec, setSpec] = useState<CanvasSpec>(initialSpec);
    return (
      <EditorStateProvider>
        <SpecProvider spec={spec} onChange={setSpec}>
          {children}
        </SpecProvider>
      </EditorStateProvider>
    );
  };
}

describe('SpecContext — background operations', () => {
  describe('addBackground', () => {
    it('appends a background with the given geometry', async () => {
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper({}) });
      await act(async () => {
        result.current.addBackground(10, 20, 300, 150);
      });
      const backgrounds = result.current.spec.backgrounds ?? [];
      expect(backgrounds).toHaveLength(1);
      expect(backgrounds[0]).toMatchObject({ x: 10, y: 20, width: 300, height: 150 });
    });

    it('assigns a unique id', async () => {
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper({}) });
      await act(async () => {
        result.current.addBackground(0, 0, 100, 100);
      });
      await act(async () => {
        result.current.addBackground(0, 0, 100, 100);
      });
      const ids = (result.current.spec.backgrounds ?? []).map((bg) => bg.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('appends without overwriting existing backgrounds', async () => {
      const initial: CanvasSpec = { backgrounds: [makeBackground('existing')] };
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.addBackground(5, 5, 50, 50);
      });
      expect(result.current.spec.backgrounds).toHaveLength(2);
      expect(result.current.spec.backgrounds?.[0]?.id).toBe('existing');
    });
  });

  describe('moveBackground', () => {
    it('swaps with previous element when direction is up', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('a'), makeBackground('b'), makeBackground('c')],
      };
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.moveBackground('b', 'up');
      });
      const ids = (result.current.spec.backgrounds ?? []).map((bg) => bg.id);
      expect(ids).toEqual(['b', 'a', 'c']);
    });

    it('swaps with next element when direction is down', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('a'), makeBackground('b'), makeBackground('c')],
      };
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.moveBackground('b', 'down');
      });
      const ids = (result.current.spec.backgrounds ?? []).map((bg) => bg.id);
      expect(ids).toEqual(['a', 'c', 'b']);
    });

    it('no-ops when moving the first element up', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('a'), makeBackground('b')],
      };
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.moveBackground('a', 'up');
      });
      const ids = (result.current.spec.backgrounds ?? []).map((bg) => bg.id);
      expect(ids).toEqual(['a', 'b']);
    });

    it('no-ops when moving the last element down', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('a'), makeBackground('b')],
      };
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.moveBackground('b', 'down');
      });
      const ids = (result.current.spec.backgrounds ?? []).map((bg) => bg.id);
      expect(ids).toEqual(['a', 'b']);
    });

    it('no-ops for an unknown id', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('a'), makeBackground('b')],
      };
      const { result } = renderHook(() => useSpecContext(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.moveBackground('unknown', 'up');
      });
      const ids = (result.current.spec.backgrounds ?? []).map((bg) => bg.id);
      expect(ids).toEqual(['a', 'b']);
    });
  });

  describe('deleteSelected — backgrounds', () => {
    it('removes the selected background', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('a'), makeBackground('b'), makeBackground('c')],
      };
      const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.editor.selectItems(new Set(['b']));
      });
      await act(async () => {
        result.current.spec.deleteSelected();
      });
      const ids = (result.current.spec.spec.backgrounds ?? []).map((bg) => bg.id);
      expect(ids).toEqual(['a', 'c']);
    });

    it('leaves backgrounds untouched when none are selected', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('a'), makeBackground('b')],
      };
      const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.spec.deleteSelected();
      });
      expect(result.current.spec.spec.backgrounds).toHaveLength(2);
    });

    it('does not remove nodes or edges when only a background is selected', async () => {
      const initial: CanvasSpec = {
        backgrounds: [makeBackground('bg1')],
        nodes: [{ id: 'n1', x: 0, y: 0, width: 40, height: 40, kind: 'rectangle' }],
        edges: [{ id: 'e1', source: 'n1', target: '' }],
      };
      const { result } = renderHook(() => useTestHook(), { wrapper: makeWrapper(initial) });
      await act(async () => {
        result.current.editor.selectItems(new Set(['bg1']));
      });
      await act(async () => {
        result.current.spec.deleteSelected();
      });
      expect(result.current.spec.spec.backgrounds).toHaveLength(0);
      expect(result.current.spec.spec.nodes).toHaveLength(1);
      expect(result.current.spec.spec.edges).toHaveLength(1);
    });
  });
});
