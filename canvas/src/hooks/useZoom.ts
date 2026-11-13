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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Point } from '../model';
import { resolveMouseShortcut } from '../utils/shortcuts';

const FIT_PADDING = 40;

// Interactive zoom bounds for `view` mode so a ctrl/meta wheel can't zoom the graph to a speck or
// blow it up past usefulness. `edit` mode keeps d3-zoom's default (unbounded) extent.
const VIEW_SCALE_EXTENT: [number, number] = [0.05, 8];
const DEFAULT_SCALE_EXTENT: [number, number] = [0, Infinity];

// Click vs. drag threshold (px) for `view` mode, where the left button both pans and clicks nodes.
// d3-zoom defaults to 0, which treats sub-pixel hand jitter during a click as a drag and swallows
// the node's click; a few pixels of slack lets a near-stationary click reach node navigation.
const VIEW_CLICK_DISTANCE = 4;

// Multiplier applied per press of the on-screen zoom-in/out buttons (zoom-out uses its reciprocal).
export const ZOOM_STEP_FACTOR = 1.5;

/**
 * Whether a zoom scale `k` sits at (or past) either `scaleExtent` bound, within a small epsilon so
 * float drift from repeated `scaleBy` steps doesn't leave a zoom button wrongly enabled. Drives the
 * on-screen controls' disabled state; d3-zoom's own clamp remains the source of truth for zooming.
 */
export function isAtScaleLimit(k: number, [min, max]: [number, number]): { atMin: boolean; atMax: boolean } {
  const EPSILON = 1e-6;
  return { atMin: k <= min * (1 + EPSILON), atMax: k >= max * (1 - EPSILON) };
}

/**
 * Controls which gestures start a pan or zoom.
 *
 * - `edit` (default): the gestures the manual editor relies on. Pan with the
 *   middle mouse button only, and zoom with the wheel only while ctrl/meta is
 *   held. This leaves the left button free for the editor's node move, edge
 *   drag and rubber-band selection, and leaves a plain wheel free for page
 *   scrolling.
 * - `view`: the read-only display panel, which has no editing gestures to
 *   protect. Pan with the left or middle mouse button and zoom with the wheel
 *   only while ctrl/meta is held (same as `edit`).
 */
export type ZoomInteractionMode = 'edit' | 'view';

export interface UseZoomOptions {
  interactionMode?: ZoomInteractionMode;
}

/**
 * d3-zoom gesture gate: decides whether a raw DOM event should start a pan/zoom.
 *
 * Delegates to the shared shortcut model (`resolveMouseShortcut`) so the gestures, their buttons and
 * the documented tooltips stay in one place. A gesture starts only for the `zoom` (ctrl/meta wheel)
 * and `pan` (mousedown) shortcuts; everything else — a plain wheel, a right click, a double-click —
 * is left alone so the page keeps scrolling and the panel keeps its fit/reset double-click. The
 * resolver is mode-aware: `view` pans with the left or middle button, `edit` with the middle button
 * only, leaving the editor's left button free for node move, edge drag and rubber-band selection.
 *
 * Exported for unit testing: d3-zoom is ESM-only and awkward to drive through the DOM, so the
 * decision lives in a pure function the hook installs via `zoomBehavior.filter`.
 */
export function shouldStartGesture(event: Event, interactionMode: ZoomInteractionMode): boolean {
  if (!(event instanceof MouseEvent)) {
    return false;
  }
  const id = resolveMouseShortcut(event, interactionMode === 'view' ? 'view' : 'editor')?.id;
  return id === 'zoom' || id === 'pan';
}

/**
 * Whether we should cancel a wheel event's browser default (ctrl/meta held → the page's pinch/zoom).
 *
 * Mirrors the wheel branch of `shouldStartGesture`: a modified wheel is a zoom gesture we claim for
 * the canvas, so its default must never reach the page. d3-zoom calls `preventDefault` itself when a
 * modified wheel actually changes the transform, but it returns *before* doing so when the new scale
 * is clamped to an unchanged value at a `scaleExtent` limit — leaving the browser free to zoom the
 * whole dashboard page. We preventDefault these events ourselves so that can't happen, while leaving
 * a plain (unmodified) wheel untouched so it keeps scrolling the surrounding page.
 *
 * Exported for unit testing alongside the other pure gesture predicates.
 */
export function shouldPreventWheelDefault(event: WheelEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

/**
 * The step-zoom direction a modified wheel implies: `1` to zoom in (scroll up, `deltaY < 0`), `-1`
 * to zoom out (scroll down), `0` for no vertical movement. Used to route modified wheels that land on
 * the on-screen controls overlay — a sibling of the SVG that d3-zoom's own listener never sees — into
 * a canvas zoom step, matching the overlay's +/- buttons. Exported for unit testing.
 */
export function wheelZoomDirection(deltaY: number): -1 | 0 | 1 {
  if (deltaY < 0) {
    return 1;
  }
  if (deltaY > 0) {
    return -1;
  }
  return 0;
}

export interface UseZoomResult {
  svgRef: (node: SVGSVGElement | null) => void;
  /**
   * Ref for the element wrapping the SVG and the on-screen controls overlay. A non-passive wheel
   * listener here cancels the browser's page zoom for modified wheels anywhere over the panel —
   * including the overlay, whose events never reach the SVG's d3-zoom listener — and routes a
   * modified wheel over the overlay into a canvas zoom step.
   */
  containerRef: (node: HTMLElement | null) => void;
  transform: ZoomTransform;
  isPanning: boolean;
  fitView: (
    boundingBox: { minX: number; minY: number; maxX: number; maxY: number },
    canvasWidth: number,
    canvasHeight: number,
  ) => void;
  toCanvasPoint: (event: PointerEvent<SVGSVGElement>) => Point;
  resetPan: () => void;
  /** Step the zoom up/down by `ZOOM_STEP_FACTOR` about the panel center (for the on-screen controls). */
  zoomIn: () => void;
  zoomOut: () => void;
  /** Current zoom scale (`transform.k`). */
  scale: number;
  /** Whether a further zoom-in/out step is still within the scale extent (for disabling the buttons). */
  canZoomIn: boolean;
  canZoomOut: boolean;
}

export function useZoom({ interactionMode = 'edit' }: UseZoomOptions = {}): UseZoomResult {
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [isPanning, setIsPanning] = useState(false);
  const nodeRef = useRef<SVGSVGElement | null>(null);
  // The container + wheel handler we currently have a native listener attached to, so the callback
  // ref can detach it on unmount or before re-attaching to a new node.
  const wheelListenerRef = useRef<{ node: HTMLElement; handler: (event: WheelEvent) => void } | null>(null);
  // Latest step-zoom callbacks, read by the (stable) container wheel handler so it can route a
  // modified wheel over the overlay without being re-created when those callbacks change identity.
  const stepZoomRef = useRef<{ zoomIn: () => void; zoomOut: () => void }>({ zoomIn: () => {}, zoomOut: () => {} });

  // The extent currently installed on the zoom behavior. It starts at the mode's configured bounds
  // but `fitView` can widen the lower bound to frame a very large graph (see below); tracking it in
  // state keeps the on-screen controls' disabled flags in sync with the extent d3-zoom actually
  // clamps to, instead of the static constant.
  const baseScaleExtent = useMemo(
    (): [number, number] => (interactionMode === 'view' ? VIEW_SCALE_EXTENT : DEFAULT_SCALE_EXTENT),
    [interactionMode],
  );
  const [scaleExtent, setScaleExtent] = useState<[number, number]>(baseScaleExtent);

  const zoomBehavior = useMemo(() => zoom<SVGSVGElement, unknown>(), []);

  const svgRef = useCallback(
    (node: SVGSVGElement | null): void => {
      if (!node) {
        nodeRef.current = null;
        return;
      }
      nodeRef.current = node;
      // Always set the extent (not only in view mode) so the configured bounds are explicit and a
      // future dynamic mode switch can't leave a stale clamp behind. Reset the tracked extent to the
      // mode's configured bounds too, discarding any widening a prior fitView applied.
      zoomBehavior.scaleExtent(baseScaleExtent);
      setScaleExtent(baseScaleExtent);
      if (interactionMode === 'view') {
        zoomBehavior.clickDistance(VIEW_CLICK_DISTANCE);
      }
      zoomBehavior.filter((event: Event) => shouldStartGesture(event, interactionMode));
      // Reflect a grabbing cursor only while panning (a drag), not while zooming. A zoom gesture's
      // source event resolves to the `zoom` shortcut, so isPanning stays false for it.
      zoomBehavior.on('start', ({ sourceEvent }: { sourceEvent: Event | null }) => {
        const mode = interactionMode === 'view' ? 'view' : 'editor';
        setIsPanning(sourceEvent instanceof MouseEvent && resolveMouseShortcut(sourceEvent, mode)?.id === 'pan');
      });
      zoomBehavior.on('zoom', ({ transform: t }: { transform: ZoomTransform }) => {
        setTransform(t);
      });
      zoomBehavior.on('end', () => setIsPanning(false));
      select<SVGSVGElement, unknown>(node).call(zoomBehavior);
    },
    [zoomBehavior, interactionMode, baseScaleExtent],
  );

  const containerRef = useCallback((node: HTMLElement | null): void => {
    // Detach any wheel listener from the previously-bound container first (callback-ref cleanup
    // runs with `node === null` on unmount, and with the new node when the ref target changes).
    const previous = wheelListenerRef.current;
    if (previous) {
      previous.node.removeEventListener('wheel', previous.handler);
      wheelListenerRef.current = null;
    }
    if (!node) {
      return;
    }
    // One non-passive listener on the panel wrapper covers both the SVG and the controls overlay.
    // A React onWheel can't reliably preventDefault, so it must be a native `{ passive: false }`.
    const handler = (event: WheelEvent): void => {
      if (!shouldPreventWheelDefault(event)) {
        return; // plain wheel: leave it to scroll the surrounding page
      }
      // d3-zoom only calls preventDefault on a modified wheel that changes the transform, and never
      // sees a wheel over the overlay (an SVG sibling). Cancel the browser's page zoom ourselves.
      event.preventDefault();
      // The overlay is not inside the SVG, so d3-zoom won't zoom the canvas for it; route the
      // gesture to a zoom step instead. A modified wheel over the SVG is left to d3-zoom.
      const svg = nodeRef.current;
      const target = event.target;
      const overSvg = svg !== null && target instanceof Node && svg.contains(target);
      if (!overSvg) {
        const direction = wheelZoomDirection(event.deltaY);
        if (direction === 1) {
          stepZoomRef.current.zoomIn();
        } else if (direction === -1) {
          stepZoomRef.current.zoomOut();
        }
      }
    };
    node.addEventListener('wheel', handler, { passive: false });
    wheelListenerRef.current = { node, handler };
  }, []);

  const resetPan = useCallback(() => {
    if (!nodeRef.current) {
      return;
    }
    // Restore the mode's configured extent, undoing any lower-bound widening a prior fitView applied,
    // then snap back to the identity transform (which sits inside that extent).
    zoomBehavior.scaleExtent(baseScaleExtent);
    setScaleExtent(baseScaleExtent);
    select<SVGSVGElement, unknown>(nodeRef.current).call(zoomBehavior.transform, zoomIdentity);
  }, [zoomBehavior, baseScaleExtent]);

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
      // d3-zoom clamps programmatic transforms to the current scaleExtent, so a graph whose fit
      // scale falls below the interactive floor would stay clipped after "fit to view". Widen the
      // lower bound to admit this scale (never above it) so fit always frames the whole graph.
      const [minScale, maxScale] = zoomBehavior.scaleExtent();
      if (scale < minScale) {
        const widened: [number, number] = [scale, maxScale];
        zoomBehavior.scaleExtent(widened);
        setScaleExtent(widened);
      }
      const tx = canvasWidth / 2 - (scale * (boundingBox.minX + boundingBox.maxX)) / 2;
      const ty = canvasHeight / 2 - (scale * (boundingBox.minY + boundingBox.maxY)) / 2;
      const t = zoomIdentity.translate(tx, ty).scale(scale);
      select<SVGSVGElement, unknown>(nodeRef.current).call(zoomBehavior.transform, t);
    },
    [zoomBehavior],
  );

  const zoomBy = useCallback(
    (factor: number): void => {
      if (!nodeRef.current) {
        return;
      }
      // No focus point given, so d3-zoom scales about the viewport center (derived from the SVG's
      // client box, since we never call zoomBehavior.extent). scaleBy clamps to the scaleExtent.
      select<SVGSVGElement, unknown>(nodeRef.current).call(zoomBehavior.scaleBy, factor);
    },
    [zoomBehavior],
  );

  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP_FACTOR), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP_FACTOR), [zoomBy]);
  // Keep the container wheel handler's step-zoom callbacks current without re-binding the listener.
  useEffect(() => {
    stepZoomRef.current = { zoomIn, zoomOut };
  }, [zoomIn, zoomOut]);

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

  // Disable flags come from the extent currently installed on the behavior, tracked in `scaleExtent`
  // state. d3-zoom's own clamp in scaleBy remains the source of truth for zooming; these flags just
  // mirror it so the on-screen controls stay in sync even after a fitView widens the lower bound to
  // frame a very large graph.
  const { atMin, atMax } = isAtScaleLimit(transform.k, scaleExtent);

  return {
    svgRef,
    containerRef,
    transform,
    isPanning,
    fitView,
    toCanvasPoint,
    resetPan,
    zoomIn,
    zoomOut,
    scale: transform.k,
    canZoomIn: !atMax,
    canZoomOut: !atMin,
  };
}
