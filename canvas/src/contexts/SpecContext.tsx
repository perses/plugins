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

import { createContext, ReactElement, ReactNode, useContext, useMemo } from 'react';
import { produce } from 'immer';
import { BackgroundSpec, EdgeSpec, NodeSpec, CanvasSpec } from '../model';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../components/shared/NodeRenderer';
import { generateId } from '../utils/generateId';
import { useEditorContext } from './EditorContext';

export interface SpecContextValue {
  spec: CanvasSpec;
  nodeById: Map<string, NodeSpec>;
  edgeById: Map<string, EdgeSpec>;
  backgroundById: Map<string, BackgroundSpec>;
  updateSpec: (spec: CanvasSpec) => void;
  addNode: (x: number, y: number) => void;
  addBackground: (x: number, y: number, width: number, height: number) => void;
  moveBackground: (id: string, direction: 'up' | 'down') => void;
  deleteSelected: () => void;
  onNodePropertiesChange: (updated: NodeSpec) => void;
  onEdgePropertiesChange: (updated: EdgeSpec) => void;
  onBackgroundPropertiesChange: (updated: BackgroundSpec) => void;
}

export const SpecContext = createContext<SpecContextValue | null>(null);

export function useSpecContext(): SpecContextValue {
  const ctx = useContext(SpecContext);
  if (!ctx) {
    throw new Error('useSpecContext must be used inside a SpecProvider');
  }
  return ctx;
}

interface SpecProviderProps {
  spec: CanvasSpec;
  onChange: (v: CanvasSpec) => void;
  children: ReactNode;
}

export function SpecProvider({ spec, onChange, children }: SpecProviderProps): ReactElement {
  const { state, clearSelection, selectItems } = useEditorContext();

  const nodeById = useMemo(() => {
    const nodes = spec.nodes ?? [];
    return new Map(nodes.map((n) => [n.id, n]));
  }, [spec.nodes]);

  const edgeById = useMemo(() => {
    const edges = spec.edges ?? [];
    return new Map(edges.map((ed) => [ed.id, ed]));
  }, [spec.edges]);

  const backgroundById = useMemo(() => {
    const backgrounds = spec.backgrounds ?? [];
    return new Map(backgrounds.map((bg) => [bg.id, bg]));
  }, [spec.backgrounds]);

  function addNode(x: number, y: number): void {
    const id = generateId('node');
    onChange(
      produce(spec, (draft) => {
        (draft.nodes ??= []).push({
          id,
          x,
          y,
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
          kind: 'icon',
        });
      })
    );
    selectItems(new Set([id]));
  }

  function addBackground(x: number, y: number, width: number, height: number): void {
    const id = generateId('bg');
    onChange(
      produce(spec, (draft) => {
        (draft.backgrounds ??= []).push({ id, x, y, width, height });
      })
    );
    selectItems(new Set([id]));
  }

  function moveBackground(id: string, direction: 'up' | 'down'): void {
    onChange(
      produce(spec, (draft) => {
        const arr = draft.backgrounds ?? [];
        const idx = arr.findIndex((bg) => bg.id === id);
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (idx === -1 || swapIdx < 0 || swapIdx >= arr.length) {
          return;
        }
        const tmp = arr[idx]!;
        arr[idx] = arr[swapIdx]!;
        arr[swapIdx] = tmp;
      })
    );
  }

  function deleteSelected(): void {
    const { selectedIds } = state;
    onChange(
      produce(spec, (draft) => {
        draft.backgrounds = (draft.backgrounds ?? []).filter((bg) => !selectedIds.has(bg.id));
        draft.nodes = (draft.nodes ?? []).filter((n) => !selectedIds.has(n.id));
        draft.edges = (draft.edges ?? []).filter(
          (ed) => !selectedIds.has(ed.id) && !selectedIds.has(ed.source) && !selectedIds.has(ed.target)
        );
      })
    );
    clearSelection();
  }

  function onNodePropertiesChange(updated: NodeSpec): void {
    onChange(
      produce(spec, (draft) => {
        const idx = (draft.nodes ?? []).findIndex((n) => n.id === updated.id);
        if (idx !== -1 && draft.nodes) {
          draft.nodes[idx] = updated;
        }
      })
    );
  }

  function onEdgePropertiesChange(updated: EdgeSpec): void {
    onChange(
      produce(spec, (draft) => {
        const idx = (draft.edges ?? []).findIndex((ed) => ed.id === updated.id);
        if (idx !== -1 && draft.edges) {
          draft.edges[idx] = updated;
        }
      })
    );
  }

  function onBackgroundPropertiesChange(updated: BackgroundSpec): void {
    onChange(
      produce(spec, (draft) => {
        const idx = (draft.backgrounds ?? []).findIndex((bg) => bg.id === updated.id);
        if (idx !== -1 && draft.backgrounds) {
          draft.backgrounds[idx] = updated;
        }
      })
    );
  }

  return (
    <SpecContext.Provider
      value={{
        spec,
        updateSpec: onChange,
        nodeById,
        edgeById,
        backgroundById,
        addNode,
        addBackground,
        moveBackground,
        deleteSelected,
        onNodePropertiesChange,
        onEdgePropertiesChange,
        onBackgroundPropertiesChange,
      }}
    >
      {children}
    </SpecContext.Provider>
  );
}
