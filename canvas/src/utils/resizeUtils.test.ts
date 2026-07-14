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

import { nodeBoundingBox, handlePosition } from './resizeUtils';

describe('nodeBoundingBox', () => {
  it('returns null for empty inputs', () => {
    expect(nodeBoundingBox([], [])).toBeNull();
  });

  it('computes bounding box for a single node', () => {
    const result = nodeBoundingBox([{ x: 0, y: 0, width: 100, height: 60 }]);
    expect(result).toEqual({ minX: -50, minY: -30, maxX: 50, maxY: 30 });
  });

  it('expands to cover multiple nodes', () => {
    const result = nodeBoundingBox([
      { x: 0, y: 0, width: 100, height: 60 },
      { x: 200, y: 100, width: 100, height: 60 },
    ]);
    expect(result).toEqual({ minX: -50, minY: -30, maxX: 250, maxY: 130 });
  });

  it('expands to cover free edge endpoints', () => {
    const result = nodeBoundingBox([{ x: 0, y: 0, width: 100, height: 60 }], [{ x: 300, y: 200 }]);
    expect(result?.maxX).toBe(300);
    expect(result?.maxY).toBe(200);
  });

  it('works with only free edge endpoints', () => {
    const result = nodeBoundingBox(
      [],
      [
        { x: 10, y: 20 },
        { x: -5, y: 50 },
      ]
    );
    expect(result).toEqual({ minX: -5, minY: 20, maxX: 10, maxY: 50 });
  });

  it('handles a free edge endpoint at the origin (0, 0)', () => {
    const result = nodeBoundingBox([], [{ x: 0, y: 0 }]);
    expect(result).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
});

describe('handlePosition', () => {
  const bbox = { minX: 0, minY: 0, maxX: 200, maxY: 100 };

  it('nw is top-left corner', () => {
    expect(handlePosition(bbox, 'nw')).toEqual({ x: 0, y: 0 });
  });

  it('se is bottom-right corner', () => {
    expect(handlePosition(bbox, 'se')).toEqual({ x: 200, y: 100 });
  });

  it('n is top-center', () => {
    expect(handlePosition(bbox, 'n')).toEqual({ x: 100, y: 0 });
  });

  it('e is right-center', () => {
    expect(handlePosition(bbox, 'e')).toEqual({ x: 200, y: 50 });
  });

  it('s is bottom-center', () => {
    expect(handlePosition(bbox, 's')).toEqual({ x: 100, y: 100 });
  });
});
