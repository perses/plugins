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

import { PointerEvent, useCallback, useState } from 'react';
import { CanvasSpec } from '../model';
import { useZoomContext } from '../contexts/ZoomContext';
import { useEditorContext } from '../contexts/EditorContext';
import { useSpecContext } from '../contexts/SpecContext';

interface MoveDrag {
  totalDx: number;
  totalDy: number;
  origNodes: Array<{ id: string; x: number; y: number }>;
  origEdges: Array<{ id: string; x2: number; y2: number }>;
}

interface UseNodeMoveResult {
  selectNode: (event: PointerEvent<SVGRectElement>, id: string) => string | null;
  updateMove: (event: PointerEvent<SVGRectElement>, id: string) => void;
  applyMove: (draft: CanvasSpec) => void;
  resetMove: () => void;
}

export function useNodeMove(): UseNodeMoveResult {
  const { spec } = useSpecContext();
  const {
    state: { selectedIds },
  } = useEditorContext();
  const { transform } = useZoomContext();
  const [moveDrag, setMoveDrag] = useState<MoveDrag | null>(null);

  const selectNode = useCallback(
    (event: PointerEvent<SVGRectElement>, id: string): string | null => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      if (!selectedIds.has(id)) {
        return id;
      }
      const origNodes = (spec.nodes ?? [])
        .filter((n) => selectedIds.has(n.id))
        .map((n) => ({ id: n.id, x: n.x, y: n.y }));
      const origEdges = (spec.edges ?? [])
        .filter(
          (ed): ed is typeof ed & { x2: number; y2: number } =>
            selectedIds.has(ed.id) && ed.x2 !== undefined && ed.y2 !== undefined
        )
        .map((ed) => ({ id: ed.id, x2: ed.x2, y2: ed.y2 }));
      setMoveDrag({ totalDx: 0, totalDy: 0, origNodes, origEdges });
      return null;
    },
    [selectedIds, spec]
  );

  const updateMove = useCallback(
    (event: PointerEvent<SVGRectElement>, id: string): void => {
      if (event.buttons === 0 || !selectedIds.has(id)) {
        return;
      }
      const dx = event.movementX / transform.k;
      const dy = event.movementY / transform.k;
      setMoveDrag((current) => {
        if (!current) {
          return null;
        }
        return { ...current, totalDx: current.totalDx + dx, totalDy: current.totalDy + dy };
      });
    },
    [selectedIds, transform.k]
  );

  const applyMove = useCallback(
    (draft: CanvasSpec): void => {
      if (!moveDrag) {
        return;
      }
      const { totalDx, totalDy, origNodes, origEdges } = moveDrag;
      const origNodeMap = new Map(origNodes.map((n) => [n.id, n]));
      const origEdgeMap = new Map(origEdges.map((ed) => [ed.id, ed]));
      (draft.nodes ?? []).forEach((n) => {
        const orig = origNodeMap.get(n.id);
        if (orig) {
          n.x = orig.x + totalDx;
          n.y = orig.y + totalDy;
        }
      });
      (draft.edges ?? []).forEach((edge) => {
        const orig = origEdgeMap.get(edge.id);
        if (orig) {
          edge.x2 = orig.x2 + totalDx;
          edge.y2 = orig.y2 + totalDy;
        }
      });
    },
    [moveDrag]
  );

  const resetMove = useCallback((): void => {
    setMoveDrag(null);
  }, []);

  return { selectNode, updateMove, applyMove, resetMove };
}
