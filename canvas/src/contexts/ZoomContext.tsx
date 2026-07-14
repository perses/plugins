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

import { createContext, ReactNode, useContext } from 'react';
import { UseZoomResult } from '../hooks/useZoom';

export type ZoomContextValue = Pick<UseZoomResult, 'toCanvasPoint' | 'transform' | 'fitView' | 'resetPan'>;

export const ZoomContext = createContext<ZoomContextValue | null>(null);

export function useZoomContext(): ZoomContextValue {
  const ctx = useContext(ZoomContext);
  if (!ctx) {
    throw new Error('useZoomContext must be used inside a ZoomProvider');
  }
  return ctx;
}

export function ZoomProvider({ value, children }: { value: ZoomContextValue; children: ReactNode }): ReactNode {
  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}
