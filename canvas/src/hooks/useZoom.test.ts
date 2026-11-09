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

import { act, renderHook } from '@testing-library/react';

import { isAtScaleLimit, shouldStartGesture, useZoom } from './useZoom';

describe('shouldStartGesture', () => {
  it('never starts a gesture on double-click, in either mode', () => {
    const dblclick = new MouseEvent('dblclick');
    expect(shouldStartGesture(dblclick, 'view')).toBe(false);
    expect(shouldStartGesture(dblclick, 'edit')).toBe(false);
  });

  describe('wheel', () => {
    it('never zooms on a plain wheel, in either mode (a plain wheel scrolls the page)', () => {
      const wheel = new WheelEvent('wheel');
      expect(shouldStartGesture(wheel, 'view')).toBe(false);
      expect(shouldStartGesture(wheel, 'edit')).toBe(false);
    });

    it('zooms on a modified wheel (ctrl/meta) in both modes, including trackpad pinch', () => {
      expect(shouldStartGesture(new WheelEvent('wheel', { ctrlKey: true }), 'edit')).toBe(true);
      expect(shouldStartGesture(new WheelEvent('wheel', { metaKey: true }), 'edit')).toBe(true);
      expect(shouldStartGesture(new WheelEvent('wheel', { ctrlKey: true }), 'view')).toBe(true);
      expect(shouldStartGesture(new WheelEvent('wheel', { metaKey: true }), 'view')).toBe(true);
    });
  });

  describe('mouse buttons', () => {
    it('pans on the middle button in both modes', () => {
      const middle = new MouseEvent('mousedown', { button: 1 });
      expect(shouldStartGesture(middle, 'view')).toBe(true);
      expect(shouldStartGesture(middle, 'edit')).toBe(true);
    });

    it('pans on the left button only in view mode', () => {
      const left = new MouseEvent('mousedown', { button: 0 });
      expect(shouldStartGesture(left, 'view')).toBe(true);
      expect(shouldStartGesture(left, 'edit')).toBe(false);
    });

    it('ignores the right button in both modes', () => {
      const right = new MouseEvent('mousedown', { button: 2 });
      expect(shouldStartGesture(right, 'view')).toBe(false);
      expect(shouldStartGesture(right, 'edit')).toBe(false);
    });
  });

  it('ignores events that are neither wheel nor mouse', () => {
    expect(shouldStartGesture(new Event('touchstart'), 'view')).toBe(false);
    expect(shouldStartGesture(new Event('touchstart'), 'edit')).toBe(false);
  });
});

describe('isAtScaleLimit', () => {
  const extent: [number, number] = [0.05, 8];

  it('flags the lower bound', () => {
    expect(isAtScaleLimit(0.05, extent)).toEqual({ atMin: true, atMax: false });
  });

  it('flags the upper bound', () => {
    expect(isAtScaleLimit(8, extent)).toEqual({ atMin: false, atMax: true });
  });

  it('flags neither in the middle of the range', () => {
    expect(isAtScaleLimit(1, extent)).toEqual({ atMin: false, atMax: false });
  });

  it('flags a scale past either bound', () => {
    expect(isAtScaleLimit(0.01, extent)).toEqual({ atMin: true, atMax: false });
    expect(isAtScaleLimit(12, extent)).toEqual({ atMin: false, atMax: true });
  });

  it('tolerates float drift at the bounds via an epsilon', () => {
    // A scale a hair above the floor / below the ceiling from repeated scaleBy steps still counts
    // as "at the limit" so the button stays disabled rather than flickering enabled.
    expect(isAtScaleLimit(0.05 * (1 + 1e-9), extent).atMin).toBe(true);
    expect(isAtScaleLimit(8 * (1 - 1e-9), extent).atMax).toBe(true);
  });
});

// d3-zoom scales about the viewport center derived from the SVG client box. jsdom reports a zero
// box, which collapses the center but still lets programmatic transforms apply, so we give the SVG
// a size via a stubbed getBoundingClientRect, and stub width/height.baseVal for defaultExtent.
function mountViewZoomWithSvg(): ReturnType<typeof renderHook<ReturnType<typeof useZoom>, unknown>> {
  const rendered = renderHook(() => useZoom({ interactionMode: 'view' }));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.getBoundingClientRect = (): DOMRect =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  Object.defineProperty(svg, 'width', { value: { baseVal: { value: 400 } }, configurable: true });
  Object.defineProperty(svg, 'height', { value: { baseVal: { value: 300 } }, configurable: true });
  act(() => rendered.result.current.svgRef(svg));
  return rendered;
}

describe('useZoom effective scale extent', () => {
  it('keeps zoom-out available after fitView widens the floor below the configured extent', () => {
    const { result } = mountViewZoomWithSvg();

    // A graph far larger than the panel fits at a scale well below the 0.05 view floor; fitView
    // widens the lower bound to admit it, leaving the scale pinned at the new floor.
    act(() => result.current.fitView({ minX: 0, minY: 0, maxX: 40000, maxY: 30000 }, 400, 300));
    const fittedScale = result.current.scale;
    expect(fittedScale).toBeLessThan(0.05);
    expect(result.current.canZoomOut).toBe(false); // at the widened floor
    expect(result.current.canZoomIn).toBe(true);

    // One zoom-in step lifts the scale off the widened floor; zoom-out must re-enable against that
    // same widened extent rather than the static 0.05 constant.
    act(() => result.current.zoomIn());
    expect(result.current.scale).toBeGreaterThan(fittedScale);
    expect(result.current.canZoomOut).toBe(true);
  });

  it('restores the configured extent on resetPan', () => {
    const { result } = mountViewZoomWithSvg();

    act(() => result.current.fitView({ minX: 0, minY: 0, maxX: 40000, maxY: 30000 }, 400, 300));
    act(() => result.current.resetPan());

    // Back at identity (scale 1) with the configured extent restored: both directions available.
    expect(result.current.scale).toBe(1);
    expect(result.current.canZoomIn).toBe(true);
    expect(result.current.canZoomOut).toBe(true);
  });
});
