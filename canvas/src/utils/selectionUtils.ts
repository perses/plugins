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
import type { SelectionRect } from '../hooks/useRectSelect';

export function computeSelectionFromRect(rect: SelectionRect, nodes: NodeSpec[], edges: EdgeSpec[]): Set<string> {
  const minX = Math.min(rect.x0, rect.x1);
  const maxX = Math.max(rect.x0, rect.x1);
  const minY = Math.min(rect.y0, rect.y1);
  const maxY = Math.max(rect.y0, rect.y1);
  const inBox = (x: number, y: number): boolean => x >= minX && x <= maxX && y >= minY && y <= maxY;
  return new Set([
    ...nodes.filter((n) => inBox(n.x, n.y)).map((n) => n.id),
    ...edges.filter((ed) => ed.x2 !== undefined && ed.y2 !== undefined && inBox(ed.x2, ed.y2)).map((ed) => ed.id),
  ]);
}
