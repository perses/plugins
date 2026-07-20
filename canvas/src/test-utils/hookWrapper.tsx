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

import React, { ReactNode, useState } from 'react';
import { CanvasSpec } from '../model';
import { EditorStateProvider } from '../contexts/EditorContext';
import { SpecContext, SpecContextValue } from '../contexts/SpecContext';
import { ZoomContext, ZoomContextValue } from '../contexts/ZoomContext';

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
  toCanvasPoint: (event) => ({
    x: (event as unknown as MouseEvent).clientX,
    y: (event as unknown as MouseEvent).clientY,
  }),
  fitView: jest.fn(),
  resetPan: jest.fn(),
};

interface WrapperProps {
  initialSpec?: CanvasSpec;
  children: ReactNode;
}

/**
 * Provides all three contexts needed by canvas hooks.
 * SpecContext is wired to local state so onChange calls are reflected in the hook.
 */
export function HookWrapper({ initialSpec = {}, children }: WrapperProps): React.ReactElement {
  const [spec, setSpec] = useState<CanvasSpec>(initialSpec);

  const nodeById = React.useMemo(() => new Map((spec.nodes ?? []).map((n) => [n.id, n])), [spec.nodes]);
  const edgeById = React.useMemo(() => new Map((spec.edges ?? []).map((ed) => [ed.id, ed])), [spec.edges]);
  const backgroundById = React.useMemo(
    () => new Map((spec.backgrounds ?? []).map((bg) => [bg.id, bg])),
    [spec.backgrounds]
  );

  const specCtx: SpecContextValue = {
    spec,
    nodeById,
    edgeById,
    backgroundById,
    updateSpec: setSpec,
    addNode: jest.fn(),
    addBackground: jest.fn(),
    moveBackground: jest.fn(),
    deleteSelected: jest.fn(),
    onNodePropertiesChange: jest.fn(),
    onEdgePropertiesChange: jest.fn(),
    onBackgroundPropertiesChange: jest.fn(),
  };

  return (
    <EditorStateProvider>
      <SpecContext.Provider value={specCtx}>
        <ZoomContext.Provider value={stubZoom}>{children}</ZoomContext.Provider>
      </SpecContext.Provider>
    </EditorStateProvider>
  );
}

export function makeWrapper(initialSpec?: CanvasSpec) {
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return <HookWrapper initialSpec={initialSpec}>{children}</HookWrapper>;
  };
}
