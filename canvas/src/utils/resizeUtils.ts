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

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const RESIZE_HANDLE_IDS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
export type ResizeHandleId = (typeof RESIZE_HANDLE_IDS)[number];

export function nodeBoundingBox(
  nodes: Array<{ x: number; y: number; width: number; height: number }>,
  floatingPoints: Array<{ x: number; y: number }> = []
): BoundingBox | null {
  if (nodes.length === 0 && floatingPoints.length === 0) {
    return null;
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    const halfW = n.width / 2;
    const halfH = n.height / 2;
    minX = Math.min(minX, n.x - halfW);
    minY = Math.min(minY, n.y - halfH);
    maxX = Math.max(maxX, n.x + halfW);
    maxY = Math.max(maxY, n.y + halfH);
  }
  for (const p of floatingPoints) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export const HANDLE_POSITIONS = {
  nw: [0, 0],
  n: [0.5, 0],
  ne: [1, 0],
  w: [0, 0.5],
  e: [1, 0.5],
  sw: [0, 1],
  s: [0.5, 1],
  se: [1, 1],
} as const;

export const OPPOSITE_HANDLE = {
  nw: 'se',
  n: 's',
  ne: 'sw',
  w: 'e',
  e: 'w',
  sw: 'ne',
  s: 'n',
  se: 'nw',
} as const;

export function handlePosition(boundingBox: BoundingBox, h: ResizeHandleId): { x: number; y: number } {
  const [tx, ty] = HANDLE_POSITIONS[h];
  return {
    x: boundingBox.minX + (boundingBox.maxX - boundingBox.minX) * tx,
    y: boundingBox.minY + (boundingBox.maxY - boundingBox.minY) * ty,
  };
}

export const RESIZE_CURSORS: Record<ResizeHandleId, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  w: 'ew-resize',
  e: 'ew-resize',
  sw: 'nesw-resize',
  s: 'ns-resize',
  se: 'nwse-resize',
};
