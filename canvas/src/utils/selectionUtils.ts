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

import type { EdgeSpec, NodeSpec, SelectionRect } from '../model';
import { normRect } from '../model';

export function computeSelectionFromRect(rect: SelectionRect, nodes: NodeSpec[], edges: EdgeSpec[]): Set<string> {
  const { x, y, width, height } = normRect(rect);
  const maxX = x + width;
  const maxY = y + height;
  const inBox = (px: number, py: number): boolean => px >= x && px <= maxX && py >= y && py <= maxY;
  return new Set([
    ...nodes.filter((n) => inBox(n.position.x, n.position.y)).map((n) => n.id),
    ...edges
      .filter((ed) => ed.freeEndpoint !== undefined && inBox(ed.freeEndpoint.x, ed.freeEndpoint.y))
      .map((ed) => ed.id),
  ]);
}
