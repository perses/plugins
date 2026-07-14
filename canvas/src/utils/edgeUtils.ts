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

import { AnchorPoint, EdgeSpec, EdgeThresholdStep, NodeSpec } from '../model';

export const ANCHOR_OFFSETS: Record<AnchorPoint, [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
  nw: [-1, -1],
  ne: [1, -1],
  sw: [-1, 1],
  se: [1, 1],
};

export const ANCHOR_KEYS = Object.keys(ANCHOR_OFFSETS) as AnchorPoint[];

export function anchorPosition(node: NodeSpec, anchor: AnchorPoint): { x: number; y: number } {
  const halfW = node.width / 2;
  const halfH = node.height / 2;
  const [ox, oy] = ANCHOR_OFFSETS[anchor];
  return { x: node.x + ox * halfW, y: node.y + oy * halfH };
}

export function closestAnchor(node: NodeSpec, pt: { x: number; y: number }): AnchorPoint {
  let best: AnchorPoint = 'n';
  let bestDist = Infinity;
  for (const a of ANCHOR_KEYS) {
    const pos = anchorPosition(node, a);
    const d = Math.hypot(pos.x - pt.x, pos.y - pt.y);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

export function edgeEndpoints(
  edge: EdgeSpec,
  nodeById: Map<string, NodeSpec>
): { x1: number; y1: number; x2: number; y2: number } | null {
  const src = nodeById.get(edge.source);
  if (!src) return null;

  const p1 = edge.sourceAnchor ? anchorPosition(src, edge.sourceAnchor) : { x: src.x, y: src.y };

  let p2: { x: number; y: number };
  if (edge.target) {
    const tgt = nodeById.get(edge.target);
    if (!tgt) return null;
    p2 = edge.targetAnchor ? anchorPosition(tgt, edge.targetAnchor) : { x: tgt.x, y: tgt.y };
  } else {
    if (edge.x2 === undefined || edge.y2 === undefined) return null;
    p2 = { x: edge.x2, y: edge.y2 };
  }

  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}

export function midpoint(pts: { x1: number; y1: number; x2: number; y2: number }): { x: number; y: number } {
  return { x: (pts.x1 + pts.x2) / 2, y: (pts.y1 + pts.y2) / 2 };
}

export function strokeWidthFromThresholds(value: number, steps: EdgeThresholdStep[], defaultWidth: number): number {
  if (!steps.length) return defaultWidth;
  let result = defaultWidth;
  for (const step of steps) {
    if (value >= step.value) {
      result = step.strokeWidth;
    }
  }
  return result;
}

// Returns true if pt is within the node's bounding box plus an extra margin (in SVG space)
export function pointInsideNode(node: NodeSpec, pt: { x: number; y: number }, margin: number): boolean {
  const halfW = node.width / 2 + margin;
  const halfH = node.height / 2 + margin;
  return pt.x >= node.x - halfW && pt.x <= node.x + halfW && pt.y >= node.y - halfH && pt.y <= node.y + halfH;
}
export function snapTarget(
  nodes: NodeSpec[],
  pt: { x: number; y: number },
  excludeId: string,
  snapRadius: number
): { node: NodeSpec; anchor: AnchorPoint } | null {
  let best: { node: NodeSpec; anchor: AnchorPoint; dist: number } | null = null;
  for (const node of nodes) {
    if (node.id === excludeId) continue;
    const anchor = closestAnchor(node, pt);
    const pos = anchorPosition(node, anchor);
    const d = Math.hypot(pos.x - pt.x, pos.y - pt.y);
    if (d <= snapRadius && (!best || d < best.dist)) {
      best = { node, anchor, dist: d };
    }
  }
  return best ? { node: best.node, anchor: best.anchor } : null;
}
