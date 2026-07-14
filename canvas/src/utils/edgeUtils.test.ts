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
import {
  anchorPosition,
  closestAnchor,
  edgeEndpoints,
  midpoint,
  pointInsideNode,
  snapTarget,
  strokeWidthFromThresholds,
} from './edgeUtils';

function makeNode(id: string, x: number, y: number, width = 100, height = 60): NodeSpec {
  return { id, x, y, width, height, kind: 'rectangle' };
}

describe('anchorPosition', () => {
  const node = makeNode('a', 0, 0, 100, 60);

  it('returns center-top for n', () => {
    expect(anchorPosition(node, 'n')).toEqual({ x: 0, y: -30 });
  });

  it('returns center-bottom for s', () => {
    expect(anchorPosition(node, 's')).toEqual({ x: 0, y: 30 });
  });

  it('returns right-center for e', () => {
    expect(anchorPosition(node, 'e')).toEqual({ x: 50, y: 0 });
  });

  it('returns left-center for w', () => {
    expect(anchorPosition(node, 'w')).toEqual({ x: -50, y: 0 });
  });

  it('returns corner for se', () => {
    expect(anchorPosition(node, 'se')).toEqual({ x: 50, y: 30 });
  });

  it('respects node offset', () => {
    const offset = makeNode('b', 200, 100, 100, 60);
    expect(anchorPosition(offset, 'n')).toEqual({ x: 200, y: 70 });
  });
});

describe('closestAnchor', () => {
  const node = makeNode('a', 0, 0, 100, 60);

  it('returns n for a point directly above', () => {
    expect(closestAnchor(node, { x: 0, y: -100 })).toBe('n');
  });

  it('returns se for a point in the bottom-right', () => {
    expect(closestAnchor(node, { x: 200, y: 200 })).toBe('se');
  });

  it('returns w for a point far to the left', () => {
    expect(closestAnchor(node, { x: -200, y: 0 })).toBe('w');
  });
});

describe('edgeEndpoints', () => {
  const a = makeNode('a', 0, 0, 100, 60);
  const b = makeNode('b', 200, 0, 100, 60);
  const nodeById = new Map([
    ['a', a],
    ['b', b],
  ]);

  it('returns null when source node is missing', () => {
    expect(edgeEndpoints({ id: 'e1', source: 'x', target: 'b' }, nodeById)).toBeNull();
  });

  it('returns null when target node is missing', () => {
    expect(edgeEndpoints({ id: 'e1', source: 'a', target: 'x' }, nodeById)).toBeNull();
  });

  it('returns null for free target with no x2/y2', () => {
    expect(edgeEndpoints({ id: 'e1', source: 'a', target: '' }, nodeById)).toBeNull();
  });

  it('uses node centers when no anchors specified', () => {
    expect(edgeEndpoints({ id: 'e1', source: 'a', target: 'b' }, nodeById)).toEqual({
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 0,
    });
  });

  it('uses source anchor when specified', () => {
    const pts = edgeEndpoints({ id: 'e1', source: 'a', target: 'b', sourceAnchor: 'e' }, nodeById);
    expect(pts?.x1).toBe(50);
    expect(pts?.y1).toBe(0);
  });

  it('uses free endpoint x2/y2 when target is empty', () => {
    expect(edgeEndpoints({ id: 'e1', source: 'a', target: '', x2: 0, y2: 0 }, nodeById)).toEqual({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });
  });

  it('handles free endpoint at origin (x2=0, y2=0)', () => {
    const pts = edgeEndpoints({ id: 'e1', source: 'a', target: '', x2: 0, y2: 0 }, nodeById);
    expect(pts).not.toBeNull();
    expect(pts?.x2).toBe(0);
    expect(pts?.y2).toBe(0);
  });
});

describe('midpoint', () => {
  it('returns the midpoint of a line segment', () => {
    expect(midpoint({ x1: 0, y1: 0, x2: 100, y2: 60 })).toEqual({ x: 50, y: 30 });
  });

  it('handles negative coordinates', () => {
    expect(midpoint({ x1: -50, y1: -20, x2: 50, y2: 20 })).toEqual({ x: 0, y: 0 });
  });
});

describe('strokeWidthFromThresholds', () => {
  const steps = [
    { value: 10, strokeWidth: 2 },
    { value: 50, strokeWidth: 4 },
    { value: 100, strokeWidth: 8 },
  ];

  it('returns default when steps are empty', () => {
    expect(strokeWidthFromThresholds(999, [], 3)).toBe(3);
  });

  it('returns default when value is below all steps', () => {
    expect(strokeWidthFromThresholds(5, steps, 1)).toBe(1);
  });

  it('returns width of the highest matched step', () => {
    expect(strokeWidthFromThresholds(60, steps, 1)).toBe(4);
  });

  it('returns width at exact step boundary', () => {
    expect(strokeWidthFromThresholds(50, steps, 1)).toBe(4);
  });

  it('returns width of the last step for very large values', () => {
    expect(strokeWidthFromThresholds(999, steps, 1)).toBe(8);
  });
});

describe('pointInsideNode', () => {
  const node = makeNode('a', 0, 0, 100, 60);

  it('returns true for a point at the node center', () => {
    expect(pointInsideNode(node, { x: 0, y: 0 }, 0)).toBe(true);
  });

  it('returns true for a point on the edge boundary', () => {
    expect(pointInsideNode(node, { x: 50, y: 0 }, 0)).toBe(true);
  });

  it('returns false for a point just outside', () => {
    expect(pointInsideNode(node, { x: 51, y: 0 }, 0)).toBe(false);
  });

  it('returns true when margin extends the boundary', () => {
    expect(pointInsideNode(node, { x: 55, y: 0 }, 10)).toBe(true);
  });

  it('returns false when outside even with margin', () => {
    expect(pointInsideNode(node, { x: 100, y: 0 }, 5)).toBe(false);
  });
});

describe('snapTarget', () => {
  const a = makeNode('a', 0, 0, 100, 60);
  const b = makeNode('b', 300, 0, 100, 60);
  const nodes = [a, b];

  it('returns null when no node is within snap radius', () => {
    expect(snapTarget(nodes, { x: 150, y: 0 }, 'x', 20)).toBeNull();
  });

  it('snaps to nearest anchor within radius', () => {
    const result = snapTarget(nodes, { x: 298, y: -30 }, 'x', 20);
    expect(result?.node.id).toBe('b');
    expect(result?.anchor).toBe('n');
  });

  it('excludes the source node', () => {
    expect(snapTarget(nodes, { x: 0, y: -30 }, 'a', 20)).toBeNull();
  });

  it('prefers the closer node when two are in range', () => {
    const c = makeNode('c', 302, 0, 100, 60);
    const result = snapTarget([a, b, c], { x: 250, y: 0 }, 'x', 200);
    expect(result?.node.id).toBe('b');
  });
});
