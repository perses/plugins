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

import { NodeSpec } from '../model';
import { computeSelectionFromRect } from './selectionUtils';

function makeNode(id: string, x: number, y: number): NodeSpec {
  return { id, x, y, width: 10, height: 10, kind: 'rectangle' };
}

describe('computeSelectionFromRect', () => {
  const nodes = [makeNode('a', 10, 10), makeNode('b', 50, 50), makeNode('c', 100, 100)];

  it('selects nodes whose center is inside the rect', () => {
    const result = computeSelectionFromRect({ x0: 0, y0: 0, x1: 60, y1: 60 }, nodes, []);
    expect(result).toEqual(new Set(['a', 'b']));
  });

  it('returns empty set when rect is empty', () => {
    const result = computeSelectionFromRect({ x0: 200, y0: 200, x1: 300, y1: 300 }, nodes, []);
    expect(result.size).toBe(0);
  });

  it('handles inverted rect coordinates (drag from bottom-right to top-left)', () => {
    const result = computeSelectionFromRect({ x0: 60, y0: 60, x1: 0, y1: 0 }, nodes, []);
    expect(result).toEqual(new Set(['a', 'b']));
  });

  it('includes floating edge endpoints inside the rect', () => {
    const edges = [{ id: 'e1', source: 'a', target: '', x2: 20, y2: 20 }];
    const result = computeSelectionFromRect({ x0: 0, y0: 0, x1: 30, y1: 30 }, nodes, edges);
    expect(result.has('e1')).toBe(true);
  });

  it('excludes floating edges outside the rect', () => {
    const edges = [{ id: 'e1', source: 'a', target: '', x2: 200, y2: 200 }];
    const result = computeSelectionFromRect({ x0: 0, y0: 0, x1: 60, y1: 60 }, nodes, edges);
    expect(result.has('e1')).toBe(false);
  });

  it('excludes edges with no free endpoint (target-connected edges)', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    const result = computeSelectionFromRect({ x0: 0, y0: 0, x1: 200, y1: 200 }, nodes, edges);
    expect(result.has('e1')).toBe(false);
  });

  it('selects floating edge with x2=0, y2=0 when origin is inside rect', () => {
    const edges = [{ id: 'e1', source: 'a', target: '', x2: 0, y2: 0 }];
    const result = computeSelectionFromRect({ x0: -10, y0: -10, x1: 10, y1: 10 }, nodes, edges);
    expect(result.has('e1')).toBe(true);
  });
});
