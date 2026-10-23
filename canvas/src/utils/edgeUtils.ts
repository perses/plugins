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

import type { AnchorPoint, EdgeSpec, EdgeThresholdStep, Line, NodeSpec, Point } from '../model';

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

export const ANCHOR_LABELS: Record<AnchorPoint, string> = {
  n: 'North',
  ne: 'North East',
  e: 'East',
  se: 'South East',
  s: 'South',
  sw: 'South West',
  w: 'West',
  nw: 'North West',
};

export function anchorPosition(node: NodeSpec, anchor: AnchorPoint): Point {
  const halfW = node.width / 2;
  const halfH = node.height / 2;
  const [ox, oy] = ANCHOR_OFFSETS[anchor];
  return { x: node.position.x + ox * halfW, y: node.position.y + oy * halfH };
}

export function closestAnchor(node: NodeSpec, pt: Point): AnchorPoint {
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

export function edgeEndpoints(edge: EdgeSpec, nodeById: Map<string, NodeSpec>): Line | null {
  const src = nodeById.get(edge.source);
  if (!src) return null;

  const p1 = edge.sourceAnchor ? anchorPosition(src, edge.sourceAnchor) : src.position;

  let p2: Point;
  if (edge.target) {
    const tgt = nodeById.get(edge.target);
    if (!tgt) return null;
    p2 = edge.targetAnchor ? anchorPosition(tgt, edge.targetAnchor) : tgt.position;
  } else {
    if (!edge.freeEndpoint) return null;
    p2 = edge.freeEndpoint;
  }

  return { start: p1, end: p2 };
}

export function midpoint(line: Line): Point {
  return { x: (line.start.x + line.end.x) / 2, y: (line.start.y + line.end.y) / 2 };
}

/**
 * Returns the distance from a node's center to its perimeter along the direction (dx, dy). Icon
 * nodes render as an ellipse, so they use the ellipse boundary; rectangle and text nodes use their
 * rectangular boundary. The input direction need not be normalized.
 */
function perimeterDistance(node: NodeSpec, dx: number, dy: number): number {
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    return 0;
  }
  const ux = dx / len;
  const uy = dy / len;
  const halfW = node.width / 2;
  const halfH = node.height / 2;
  if (node.kind === 'icon') {
    // Ellipse: solve for t where ((t*ux)/halfW)^2 + ((t*uy)/halfH)^2 = 1.
    const denom = Math.hypot(ux / halfW, uy / halfH);
    return denom === 0 ? 0 : 1 / denom;
  }
  // Rectangle: distance to the nearest vertical/horizontal edge along the ray.
  const tx = ux === 0 ? Infinity : halfW / Math.abs(ux);
  const ty = uy === 0 ? Infinity : halfH / Math.abs(uy);
  return Math.min(tx, ty);
}

/**
 * Trims an edge's endpoints back to the perimeter of the nodes they connect, so the line and its
 * arrowhead touch the node boundary instead of overlapping into the node center. Endpoints that are
 * not a node center (explicit anchors or a free endpoint) are left untouched.
 */
export function clipLineToNodes(line: Line, source: NodeSpec | undefined, target: NodeSpec | undefined): Line {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    return line;
  }
  const ux = dx / len;
  const uy = dy / len;
  let start = line.start;
  let end = line.end;
  if (source) {
    const d = perimeterDistance(source, dx, dy);
    start = { x: line.start.x + ux * d, y: line.start.y + uy * d };
  }
  if (target) {
    const d = perimeterDistance(target, dx, dy);
    end = { x: line.end.x - ux * d, y: line.end.y - uy * d };
  }
  return { start, end };
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
export function pointInsideNode(node: NodeSpec, pt: Point, margin: number): boolean {
  const halfW = node.width / 2 + margin;
  const halfH = node.height / 2 + margin;
  return (
    pt.x >= node.position.x - halfW &&
    pt.x <= node.position.x + halfW &&
    pt.y >= node.position.y - halfH &&
    pt.y <= node.position.y + halfH
  );
}
export function snapTarget(
  nodes: NodeSpec[],
  pt: Point,
  excludeId: string,
  snapRadius: number,
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
