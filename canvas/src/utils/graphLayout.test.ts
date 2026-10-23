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

import type { EdgeSpec, NodeSpec } from '../model';
import { layoutGraph } from './graphLayout';

function node(id: string): NodeSpec {
  return { id, position: { x: 0, y: 0 }, width: 48, height: 48, kind: 'icon' };
}

function edge(id: string, source: string, target: string): EdgeSpec {
  return { id, source, target };
}

describe('layoutGraph', () => {
  it('returns an empty array for no nodes', () => {
    expect(layoutGraph([], [])).toEqual([]);
  });

  it('centers a single node at the origin', () => {
    const [n] = layoutGraph([node('a')], []);
    expect(n?.position).toEqual({ x: 0, y: 0 });
  });

  it('is deterministic: identical input yields identical positions', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];
    const first = layoutGraph(nodes, edges);
    const second = layoutGraph(nodes, edges);
    expect(first.map((n) => n.position)).toEqual(second.map((n) => n.position));
  });

  it('does not depend on input array order (positions follow node id)', () => {
    const a = layoutGraph([node('a'), node('b'), node('c')], []);
    const b = layoutGraph([node('c'), node('a'), node('b')], []);
    const posA = new Map(a.map((n) => [n.id, n.position]));
    const posB = new Map(b.map((n) => [n.id, n.position]));
    for (const id of ['a', 'b', 'c']) {
      expect(posB.get(id)).toEqual(posA.get(id));
    }
  });

  it('produces finite coordinates and separates nodes', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')];
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'c', 'd')];
    const laid = layoutGraph(nodes, edges);
    for (const n of laid) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
    // No two nodes end up on top of each other.
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const dist = Math.hypot(laid[i]!.position.x - laid[j]!.position.x, laid[i]!.position.y - laid[j]!.position.y);
        expect(dist).toBeGreaterThan(1);
      }
    }
  });

  it('centers the layout on its own centroid', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d'), node('e')];
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];
    const laid = layoutGraph(nodes, edges);
    const cx = laid.reduce((sum, n) => sum + n.position.x, 0) / laid.length;
    const cy = laid.reduce((sum, n) => sum + n.position.y, 0) / laid.length;
    expect(cx).toBeCloseTo(0, 6);
    expect(cy).toBeCloseTo(0, 6);
  });

  it('preserves node identity and other fields', () => {
    const laid = layoutGraph([node('a'), node('b')], []);
    expect(laid.map((n) => n.id).toSorted()).toEqual(['a', 'b']);
    expect(laid[0]?.width).toBe(48);
    expect(laid[0]?.kind).toBe('icon');
  });

  it('ignores edges that reference unknown nodes without crashing', () => {
    const laid = layoutGraph([node('a'), node('b')], [edge('e1', 'a', 'ghost')]);
    expect(laid).toHaveLength(2);
    for (const n of laid) {
      expect(Number.isFinite(n.position.x)).toBe(true);
    }
  });
});
