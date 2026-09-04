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

import type { PointerEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

import { useSpecContext } from '../contexts/SpecContext';
import { useZoomContext } from '../contexts/ZoomContext';
import type { SelectionRect } from '../model';
import { computeSelectionFromRect } from '../utils/selectionUtils';

export type { SelectionRect } from '../model';

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
      const rect: SelectionRect = { anchor: pt, corner: pt };
      rectRef.current = rect;
      setSelectionRect(rect);
      return true;
    },
    [toCanvasPoint],
  );

  const updateSelection = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      if (!rectRef.current) {
        return;
      }
      const corner = toCanvasPoint(event);
      const updated: SelectionRect = { ...rectRef.current, corner };
      rectRef.current = updated;
      setSelectionRect(updated);
    },
    [toCanvasPoint],
  );

  const applySelection = useCallback((): Set<string> => {
    const rect = rectRef.current ?? { anchor: { x: 0, y: 0 }, corner: { x: 0, y: 0 } };
    const nodes = spec.nodes ?? [];
    const edges = spec.edges ?? [];
    const hit = computeSelectionFromRect(rect, nodes, edges);
    rectRef.current = null;
    setSelectionRect(null);
    return hit;
  }, [spec.nodes, spec.edges]);

  return { selectionRect, beginSelection, updateSelection, applySelection };
}
