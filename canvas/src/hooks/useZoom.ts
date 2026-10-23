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

import { select } from 'd3-selection';
import type { ZoomTransform } from 'd3-zoom';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { PointerEvent } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { Point } from '../model';

const FIT_PADDING = 40;

/**
 * Controls which gestures start a pan or zoom.
 *
 * - `edit` (default): the gestures the manual editor relies on. Pan with the
 *   middle mouse button only, and zoom with the wheel only while ctrl/meta is
 *   held. This leaves the left button free for the editor's node move, edge
 *   drag and rubber-band selection, and leaves a plain wheel free for page
 *   scrolling.
 * - `view`: the read-only display panel, which has no editing gestures to
 *   protect. Pan with the left or middle mouse button and zoom with a plain
 *   wheel, matching the Grafana node graph.
 */
export type ZoomInteractionMode = 'edit' | 'view';

export interface UseZoomOptions {
  interactionMode?: ZoomInteractionMode;
}

export interface UseZoomResult {
  svgRef: (node: SVGSVGElement | null) => void;
  transform: ZoomTransform;
  isPanning: boolean;
  fitView: (
    boundingBox: { minX: number; minY: number; maxX: number; maxY: number },
    canvasWidth: number,
    canvasHeight: number,
  ) => void;
  toCanvasPoint: (event: PointerEvent<SVGSVGElement>) => Point;
  resetPan: () => void;
}

export function useZoom({ interactionMode = 'edit' }: UseZoomOptions = {}): UseZoomResult {
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [isPanning, setIsPanning] = useState(false);
  const nodeRef = useRef<SVGSVGElement | null>(null);

  const zoomBehavior = useMemo(() => zoom<SVGSVGElement, unknown>(), []);

  const svgRef = useCallback(
    (node: SVGSVGElement | null): void => {
      if (!node) {
        return;
      }
      nodeRef.current = node;
      if (interactionMode === 'view') {
        zoomBehavior.scaleExtent([0.05, 8]);
      }
      zoomBehavior.filter((event: Event) => {
        if (event.type === 'dblclick') {
          return false;
        }
        if (event instanceof WheelEvent) {
          // In view mode a plain wheel zooms; in edit mode it must be modified
          // so that an unmodified wheel still scrolls the surrounding page.
          return interactionMode === 'view' || event.ctrlKey || event.metaKey;
        }
        if (!(event instanceof MouseEvent)) {
          return false;
        }
        // Middle-click always pans. The left button only pans in view mode,
        // where there are no editing gestures competing for it; d3-zoom still
        // lets a stationary left click through to node click handlers.
        return event.button === 1 || (interactionMode === 'view' && event.button === 0);
      });
      zoomBehavior.on('start', () => setIsPanning(true));
      zoomBehavior.on('zoom', ({ transform: t }: { transform: ZoomTransform }) => {
        setTransform(t);
      });
      zoomBehavior.on('end', () => setIsPanning(false));
      select<SVGSVGElement, unknown>(node).call(zoomBehavior);
    },
    [zoomBehavior, interactionMode],
  );

  const resetPan = useCallback(() => {
    if (!nodeRef.current) {
      return;
    }
    select<SVGSVGElement, unknown>(nodeRef.current).call(zoomBehavior.transform, zoomIdentity);
  }, [zoomBehavior]);

  const fitView = useCallback(
    (
      boundingBox: { minX: number; minY: number; maxX: number; maxY: number },
      canvasWidth: number,
      canvasHeight: number,
    ): void => {
      if (!nodeRef.current) {
        return;
      }
      const contentW = boundingBox.maxX - boundingBox.minX + FIT_PADDING * 2;
      const contentH = boundingBox.maxY - boundingBox.minY + FIT_PADDING * 2;
      const scale = Math.min(canvasWidth / contentW, canvasHeight / contentH, 1);
      const tx = canvasWidth / 2 - (scale * (boundingBox.minX + boundingBox.maxX)) / 2;
      const ty = canvasHeight / 2 - (scale * (boundingBox.minY + boundingBox.maxY)) / 2;
      const t = zoomIdentity.translate(tx, ty).scale(scale);
      select<SVGSVGElement, unknown>(nodeRef.current).call(zoomBehavior.transform, t);
    },
    [zoomBehavior],
  );

  const toCanvasPoint = useCallback(
    (event: PointerEvent<SVGSVGElement>): Point => {
      const rect = nodeRef.current?.getBoundingClientRect();
      if (!rect) {
        throw new Error('SVG element is not available');
      }
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      return { x: transform.invertX(px), y: transform.invertY(py) };
    },
    [transform],
  );

  return { svgRef, transform, isPanning, fitView, toCanvasPoint, resetPan };
}
