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

import type { ReactElement, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { vi } from 'vitest';

import { EditorStateProvider } from '../contexts/EditorContext';
import type { SpecContextValue } from '../contexts/SpecContext';
import { SpecContext } from '../contexts/SpecContext';
import type { ZoomContextValue } from '../contexts/ZoomContext';
import { ZoomContext } from '../contexts/ZoomContext';
import type { CanvasSpec } from '../model';

// Minimal identity-transform stub — d3-zoom is ESM-only and not transformable by Jest.
const identityTransform = {
  k: 1,
  x: 0,
  y: 0,
  toString: (): string => 'translate(0,0) scale(1)',
  invertX: (x: number): number => x,
  invertY: (y: number): number => y,
  apply: (point: [number, number]): [number, number] => point,
  applyX: (x: number): number => x,
  applyY: (y: number): number => y,
};

export const stubZoom: ZoomContextValue = {
  transform: identityTransform as ZoomContextValue['transform'],
  isPanning: false,
  toCanvasPoint: (event) => ({
    x: (event as unknown as MouseEvent).clientX,
    y: (event as unknown as MouseEvent).clientY,
  }),
  fitView: vi.fn(),
  resetPan: vi.fn(),
};

interface WrapperProps {
  initialSpec?: CanvasSpec;
  children: ReactNode;
}

const EMPTY_SPEC: CanvasSpec = {};

/**
 * Provides all three contexts needed by canvas hooks.
 * SpecContext is wired to local state so onChange calls are reflected in the hook.
 */
export function HookWrapper({ initialSpec = EMPTY_SPEC, children }: WrapperProps): React.ReactElement {
  const [spec, setSpec] = useState<CanvasSpec>(initialSpec);

  const nodeById = useMemo(() => new Map((spec.nodes ?? []).map((n) => [n.id, n])), [spec.nodes]);
  const edgeById = useMemo(() => new Map((spec.edges ?? []).map((ed) => [ed.id, ed])), [spec.edges]);
  const backgroundById = useMemo(() => new Map((spec.backgrounds ?? []).map((bg) => [bg.id, bg])), [spec.backgrounds]);

  const specCtx = useMemo<SpecContextValue>(
    () => ({
      spec,
      nodeById,
      edgeById,
      backgroundById,
      updateSpec: setSpec,
      addNode: vi.fn(),
      addBackground: vi.fn(),
      moveBackground: vi.fn(),
      deleteSelected: vi.fn(),
      onNodePropertiesChange: vi.fn(),
      onEdgePropertiesChange: vi.fn(),
      onBackgroundPropertiesChange: vi.fn(),
    }),
    [spec, nodeById, edgeById, backgroundById],
  );

  return (
    <EditorStateProvider>
      <SpecContext.Provider value={specCtx}>
        <ZoomContext.Provider value={stubZoom}>{children}</ZoomContext.Provider>
      </SpecContext.Provider>
    </EditorStateProvider>
  );
}

export function makeWrapper(initialSpec?: CanvasSpec) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <HookWrapper initialSpec={initialSpec}>{children}</HookWrapper>;
  };
}
