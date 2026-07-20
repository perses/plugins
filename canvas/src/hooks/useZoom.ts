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

import { PointerEvent, useCallback, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, ZoomTransform } from 'd3-zoom';

const FIT_PADDING = 40;

export interface UseZoomResult {
  svgRef: (node: SVGSVGElement | null) => void;
  transform: ZoomTransform;
  fitView: (
    boundingBox: { minX: number; minY: number; maxX: number; maxY: number },
    canvasWidth: number,
    canvasHeight: number
  ) => void;
  toCanvasPoint: (event: PointerEvent<SVGSVGElement>) => { x: number; y: number };
  resetPan: () => void;
}

export function useZoom(): UseZoomResult {
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const nodeRef = useRef<SVGSVGElement | null>(null);

  const zoomBehavior = useMemo(() => zoom<SVGSVGElement, unknown>(), []);

  const svgRef = useCallback(
    (node: SVGSVGElement | null): void => {
      if (!node) {
        return;
      }
      nodeRef.current = node;
      zoomBehavior.filter((event: Event) => {
        if (event.type === 'dblclick') {
          return false;
        }
        if (event instanceof WheelEvent) {
          return event.ctrlKey || event.metaKey;
        }
        return event instanceof MouseEvent && event.button === 1;
      });
      zoomBehavior.on('zoom', ({ transform: t }: { transform: ZoomTransform }) => {
        setTransform(t);
      });
      select<SVGSVGElement, unknown>(node).call(zoomBehavior);
    },
    [zoomBehavior]
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
      canvasHeight: number
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
    [zoomBehavior]
  );

  const toCanvasPoint = useCallback(
    (event: PointerEvent<SVGSVGElement>): { x: number; y: number } => {
      const rect = nodeRef.current?.getBoundingClientRect();
      if (!rect) {
        throw new Error('SVG element is not available');
      }
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      return { x: transform.invertX(px), y: transform.invertY(py) };
    },
    [transform]
  );

  return { svgRef, transform, fitView, toCanvasPoint, resetPan };
}
