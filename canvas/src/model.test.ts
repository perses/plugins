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
  it('returns false when freeEndpoint is undefined', () => {
    expect(isFloatingEdge(makeEdge())).toBe(false);
  });

  it('returns true when freeEndpoint is defined', () => {
    expect(isFloatingEdge(makeEdge({ freeEndpoint: { x: 10, y: 20 } }))).toBe(true);
  });

  it('returns true when freeEndpoint is at origin', () => {
    expect(isFloatingEdge(makeEdge({ freeEndpoint: { x: 0, y: 0 } }))).toBe(true);
  });

  it('narrows the type so freeEndpoint is a Point after the check', () => {
    const edge = makeEdge({ freeEndpoint: { x: 5, y: 7 } });
    if (isFloatingEdge(edge)) {
      const x: number = edge.freeEndpoint.x;
      const y: number = edge.freeEndpoint.y;
      expect(x).toBe(5);
      expect(y).toBe(7);
    } else {
      throw new Error('expected isFloatingEdge to return true');
    }
  });
});
