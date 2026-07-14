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

import { PointerEvent, useCallback, useMemo, useState } from 'react';
import { CanvasSpec, FloatingEdge, isFloatingEdge } from '../model';
import { useZoomContext } from '../contexts/ZoomContext';
import { useEditorContext } from '../contexts/EditorContext';
import { useSpecContext } from '../contexts/SpecContext';
import {
  BoundingBox,
  HANDLE_POSITIONS,
  handlePosition,
  nodeBoundingBox,
  OPPOSITE_HANDLE,
  ResizeHandleId,
} from '../utils/resizeUtils';

const MIN_NODE_SIZE = 8;

interface ResizeDrag {
  handleId: ResizeHandleId;
  fixedX: number;
  fixedY: number;
  currentX: number;
  currentY: number;
  origBoundingBox: BoundingBox;
}

interface FinalBoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function resolveFinalBoundingBox(drag: ResizeDrag): FinalBoundingBox | null {
  const { handleId, fixedX, fixedY, currentX, currentY, origBoundingBox } = drag;
  const origWidth = origBoundingBox.maxX - origBoundingBox.minX;
  const origHeight = origBoundingBox.maxY - origBoundingBox.minY;
  if (origWidth === 0 || origHeight === 0) {
    return null;
  }
  const [tx, ty] = HANDLE_POSITIONS[handleId];
  const newMinX = tx === 0 ? currentX : fixedX;
  const newMaxX = tx === 1 ? currentX : fixedX;
  const newMinY = ty === 0 ? currentY : fixedY;
  const newMaxY = ty === 1 ? currentY : fixedY;
  return {
    minX: tx === 0.5 ? origBoundingBox.minX : Math.min(newMinX, newMaxX),
    maxX: tx === 0.5 ? origBoundingBox.maxX : Math.max(newMinX, newMaxX),
    minY: ty === 0.5 ? origBoundingBox.minY : Math.min(newMinY, newMaxY),
    maxY: ty === 0.5 ? origBoundingBox.maxY : Math.max(newMinY, newMaxY),
  };
}

function scalePoint(
  px: number,
  py: number,
  origBoundingBox: BoundingBox,
  final: FinalBoundingBox
): { x: number; y: number } {
  const origWidth = origBoundingBox.maxX - origBoundingBox.minX;
  const origHeight = origBoundingBox.maxY - origBoundingBox.minY;
  const relX = (px - origBoundingBox.minX) / origWidth;
  const relY = (py - origBoundingBox.minY) / origHeight;
  return {
    x: final.minX + relX * (final.maxX - final.minX),
    y: final.minY + relY * (final.maxY - final.minY),
  };
}

function scaleNodeSize(
  width: number,
  height: number,
  kind: string,
  origBoundingBox: BoundingBox,
  final: FinalBoundingBox
): { width: number; height: number } {
  const scaleX = (final.maxX - final.minX) / (origBoundingBox.maxX - origBoundingBox.minX);
  const scaleY = (final.maxY - final.minY) / (origBoundingBox.maxY - origBoundingBox.minY);
  if (kind === 'icon') {
    const uniformScale = Math.max(scaleX, scaleY);
    return {
      width: Math.max(MIN_NODE_SIZE, width * uniformScale),
      height: Math.max(MIN_NODE_SIZE, height * uniformScale),
    };
  }
  return {
    width: Math.max(MIN_NODE_SIZE, width * scaleX),
    height: Math.max(MIN_NODE_SIZE, height * scaleY),
  };
}

interface UseResizeResult {
  beginResize: (event: PointerEvent<SVGCircleElement>, handleId: ResizeHandleId) => boolean;
  updateResize: (event: PointerEvent<SVGSVGElement>) => void;
  applyResize: (draft: CanvasSpec) => void;
  resetResize: () => void;
}

export function useResize(): UseResizeResult {
  const { selectedIds } = useEditorContext().state;
  const { spec } = useSpecContext();
  const { toCanvasPoint } = useZoomContext();
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);

  const selectedNodes = useMemo(
    () => (spec.nodes ?? []).filter((n) => selectedIds.has(n.id)),
    [spec.nodes, selectedIds]
  );
  const selectedFloatingEdges = useMemo(
    () => (spec.edges ?? []).filter((ed): ed is FloatingEdge => selectedIds.has(ed.id) && isFloatingEdge(ed)),
    [spec.edges, selectedIds]
  );

  const beginResize = useCallback(
    (event: PointerEvent<SVGCircleElement>, handleId: ResizeHandleId): boolean => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const freeEndpoints = selectedFloatingEdges.map((ed) => ({ x: ed.x2, y: ed.y2 }));
      const selectionBounds = nodeBoundingBox(selectedNodes, freeEndpoints);
      if (!selectionBounds) {
        return false;
      }
      const current = handlePosition(selectionBounds, handleId);
      const fixed = handlePosition(selectionBounds, OPPOSITE_HANDLE[handleId]);
      setResizeDrag({
        handleId,
        fixedX: fixed.x,
        fixedY: fixed.y,
        currentX: current.x,
        currentY: current.y,
        origBoundingBox: selectionBounds,
      });
      return true;
    },
    [selectedNodes, selectedFloatingEdges]
  );

  const updateResize = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      const point = toCanvasPoint(event);
      setResizeDrag((current) => {
        if (!current) {
          return null;
        }
        return { ...current, currentX: point.x, currentY: point.y };
      });
    },
    [toCanvasPoint]
  );

  const applyResize = useCallback(
    (draft: CanvasSpec): void => {
      if (!resizeDrag) {
        return;
      }
      const final = resolveFinalBoundingBox(resizeDrag);
      if (!final) {
        return;
      }
      const { origBoundingBox } = resizeDrag;
      selectedNodes.forEach(({ id, x, y, width, height, kind }) => {
        const node = (draft.nodes ?? []).find((n) => n.id === id);
        if (!node) {
          return;
        }
        const pos = scalePoint(x, y, origBoundingBox, final);
        const size = scaleNodeSize(width, height, kind, origBoundingBox, final);
        node.x = pos.x;
        node.y = pos.y;
        node.width = size.width;
        node.height = size.height;
      });
      selectedFloatingEdges.forEach(({ id, x2, y2 }) => {
        const edge = (draft.edges ?? []).find((ed) => ed.id === id);
        if (!edge) {
          return;
        }
        const pos = scalePoint(x2, y2, origBoundingBox, final);
        edge.x2 = pos.x;
        edge.y2 = pos.y;
      });
    },
    [resizeDrag, selectedNodes, selectedFloatingEdges]
  );

  const resetResize = useCallback((): void => {
    setResizeDrag(null);
  }, []);

  return { beginResize, updateResize, applyResize, resetResize };
}
