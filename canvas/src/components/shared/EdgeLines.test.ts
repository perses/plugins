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

import { arrowScaleForSegment } from './EdgeLines';

// The arrowhead renders ARROW_SW_W (2.5) * strokeWidth user-units long.
describe('arrowScaleForSegment', () => {
  it('keeps full size when the segment is longer than the arrowhead', () => {
    // strokeWidth 2 -> arrowhead 5; a 100px segment easily fits it.
    expect(arrowScaleForSegment(100, 2)).toBe(1);
  });

  it('keeps full size at exactly the arrowhead length', () => {
    expect(arrowScaleForSegment(5, 2)).toBe(1);
  });

  it('shrinks the arrowhead to fit a short clipped segment', () => {
    // Two 48px nodes 60px apart leave a 12px gap; an 8px stroke wants a 20px arrowhead.
    // Scale to 12/20 = 0.6 so the marker tip lands on the node boundary instead of overshooting.
    expect(arrowScaleForSegment(12, 8)).toBeCloseTo(0.6);
  });

  it('never returns a negative scale for a zero-length segment', () => {
    expect(arrowScaleForSegment(0, 8)).toBe(0);
  });

  it('is full size when stroke width is zero (no arrowhead to overshoot)', () => {
    expect(arrowScaleForSegment(10, 0)).toBe(1);
  });
});
