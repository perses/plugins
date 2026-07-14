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

import { EdgeSpec, isFloatingEdge } from './model';

function makeEdge(overrides: Partial<EdgeSpec> = {}): EdgeSpec {
  return { id: 'e1', source: 'a', target: 'b', ...overrides };
}

describe('isFloatingEdge', () => {
  it('returns false when both x2 and y2 are undefined', () => {
    expect(isFloatingEdge(makeEdge())).toBe(false);
  });

  it('returns false when only x2 is defined', () => {
    expect(isFloatingEdge(makeEdge({ x2: 10 }))).toBe(false);
  });

  it('returns false when only y2 is defined', () => {
    expect(isFloatingEdge(makeEdge({ y2: 10 }))).toBe(false);
  });

  it('returns true when both x2 and y2 are defined', () => {
    expect(isFloatingEdge(makeEdge({ x2: 10, y2: 20 }))).toBe(true);
  });

  it('returns true when both x2 and y2 are 0', () => {
    expect(isFloatingEdge(makeEdge({ x2: 0, y2: 0 }))).toBe(true);
  });

  it('narrows the type so x2 and y2 are number after the check', () => {
    const edge = makeEdge({ x2: 5, y2: 7 });
    if (isFloatingEdge(edge)) {
      const x: number = edge.x2;
      const y: number = edge.y2;
      expect(x).toBe(5);
      expect(y).toBe(7);
    } else {
      throw new Error('expected isFloatingEdge to return true');
    }
  });
});
