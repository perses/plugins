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

import type { EdgeSpec, NodeSpec, Point } from '../model';

export interface LayoutOptions {
  iterations?: number;
  /** Target edge length / natural spring length. */
  springLength?: number;
  /** Repulsion strength between all node pairs. */
  repulsion?: number;
  /** Spring (attraction) strength along edges. */
  attraction?: number;
  /** Pull toward the origin, keeping disconnected components from drifting away. */
  centering?: number;
  /** Radius of the deterministic seed circle. */
  seedRadius?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  iterations: 300,
  springLength: 120,
  repulsion: 60000,
  attraction: 0.02,
  centering: 0.01,
  seedRadius: 200,
};

// Deterministic 32-bit string hash (FNV-1a) so a given node id always seeds to the same angle.
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Computes positions for generated nodes using a small, dependency-free force simulation
 * (Coulomb-style repulsion + Hookean edge springs + mild centering). Seeding is deterministic from
 * node ids, so the same topology always lays out identically across refreshes — nodes only move
 * when the set of nodes/edges changes, not when their metric values change.
 */
export function layoutGraph(nodes: NodeSpec[], edges: EdgeSpec[], options: LayoutOptions = {}): NodeSpec[] {
  const opts = { ...DEFAULTS, ...options };
  const n = nodes.length;
  if (n === 0) {
    return nodes;
  }
  if (n === 1) {
    return [{ ...nodes[0]!, position: { x: 0, y: 0 } }];
  }

  // Deterministic seed: place each node on a circle at an angle derived from its id hash.
  const pos: Point[] = nodes.map((node) => {
    const angle = (hashString(node.id) / 0xffffffff) * Math.PI * 2;
    return { x: Math.cos(angle) * opts.seedRadius, y: Math.sin(angle) * opts.seedRadius };
  });

  const indexById = new Map<string, number>();
  nodes.forEach((node, i) => indexById.set(node.id, i));

  const edgePairs: Array<[number, number]> = [];
  for (const edge of edges) {
    const a = indexById.get(edge.source);
    const b = edge.target !== undefined ? indexById.get(edge.target) : undefined;
    if (a !== undefined && b !== undefined && a !== b) {
      edgePairs.push([a, b]);
    }
  }

  const disp: Point[] = pos.map(() => ({ x: 0, y: 0 }));

  for (let iter = 0; iter < opts.iterations; iter++) {
    for (let i = 0; i < n; i++) {
      disp[i]!.x = 0;
      disp[i]!.y = 0;
    }

    // Pairwise repulsion.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[i]!.x - pos[j]!.x;
        let dy = pos[i]!.y - pos[j]!.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.01) {
          // Deterministically nudge coincident nodes apart.
          dx = ((i - j) % 2 === 0 ? 1 : -1) * 0.1;
          dy = 0.1;
          distSq = dx * dx + dy * dy;
        }
        const force = opts.repulsion / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[i]!.x += fx;
        disp[i]!.y += fy;
        disp[j]!.x -= fx;
        disp[j]!.y -= fy;
      }
    }

    // Edge springs.
    for (const [a, b] of edgePairs) {
      const dx = pos[b]!.x - pos[a]!.x;
      const dy = pos[b]!.y - pos[a]!.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist - opts.springLength) * opts.attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      disp[a]!.x += fx;
      disp[a]!.y += fy;
      disp[b]!.x -= fx;
      disp[b]!.y -= fy;
    }

    // Centering + integrate.
    for (let i = 0; i < n; i++) {
      disp[i]!.x -= pos[i]!.x * opts.centering;
      disp[i]!.y -= pos[i]!.y * opts.centering;
      pos[i]!.x += disp[i]!.x;
      pos[i]!.y += disp[i]!.y;
    }
  }

  // Recenter on the layout's own centroid. The centering force only approximately pulls toward the
  // origin and reaches equilibrium wherever repulsion/springs balance it — for small or unevenly
  // seeded graphs that equilibrium is noticeably off-origin. Shifting by the centroid guarantees the
  // result is centered on (0, 0) regardless of how the simulation settled.
  //
  // Accumulate in id-sorted order so floating-point rounding of the sum does not depend on the input
  // array order (layout is otherwise order-independent — positions follow node id, not slot).
  const order = nodes.map((_, i) => i).toSorted((a, b) => (nodes[a]!.id < nodes[b]!.id ? -1 : 1));
  let cx = 0;
  let cy = 0;
  for (const i of order) {
    cx += pos[i]!.x;
    cy += pos[i]!.y;
  }
  cx /= n;
  cy /= n;

  return nodes.map((node, i) => ({ ...node, position: { x: pos[i]!.x - cx, y: pos[i]!.y - cy } }));
}
