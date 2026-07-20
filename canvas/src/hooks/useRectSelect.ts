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

import { PointerEvent, useCallback, useRef, useState } from 'react';
import { useZoomContext } from '../contexts/ZoomContext';
import { useSpecContext } from '../contexts/SpecContext';
import { computeSelectionFromRect } from '../utils/selectionUtils';

export interface SelectionRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function isPanGesture(event: PointerEvent): boolean {
  return event.button === 1;
}

function isCanvasBackground(event: PointerEvent<SVGSVGElement>): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }
  return !event.target.closest('rect') && !event.target.closest('[data-cross]');
}

interface UseRectSelectResult {
  selectionRect: SelectionRect | null;
  beginSelection: (event: PointerEvent<SVGSVGElement>) => boolean;
  updateSelection: (event: PointerEvent<SVGSVGElement>) => void;
  applySelection: () => Set<string>;
}

export function useRectSelect(): UseRectSelectResult {
  const { spec } = useSpecContext();
  const { toCanvasPoint } = useZoomContext();
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const rectRef = useRef<SelectionRect | null>(null);

  const beginSelection = useCallback(
    (event: PointerEvent<SVGSVGElement>): boolean => {
      if (isPanGesture(event) || !isCanvasBackground(event)) {
        return false;
      }
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      const pt = toCanvasPoint(event);
      const rect = { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y };
      rectRef.current = rect;
      setSelectionRect(rect);
      return true;
    },
    [toCanvasPoint]
  );

  const updateSelection = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      if (!rectRef.current) {
        return;
      }
      const point = toCanvasPoint(event);
      const updated = { ...rectRef.current, x1: point.x, y1: point.y };
      rectRef.current = updated;
      setSelectionRect(updated);
    },
    [toCanvasPoint]
  );

  const applySelection = useCallback((): Set<string> => {
    const rect = rectRef.current ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
    const nodes = spec.nodes ?? [];
    const edges = spec.edges ?? [];
    const hit = computeSelectionFromRect(rect, nodes, edges);
    rectRef.current = null;
    setSelectionRect(null);
    return hit;
  }, [spec.nodes, spec.edges]);

  return { selectionRect, beginSelection, updateSelection, applySelection };
}
