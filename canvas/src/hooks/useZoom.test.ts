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

import { isAtScaleLimit, shouldStartGesture } from './useZoom';

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
