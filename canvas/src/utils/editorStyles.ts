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

import { CanvasTheme } from '../hooks/useCanvasTheme';

export interface EditorStyles {
  edgeHit: { strokeWidth: number };
  edge: { stroke: string; strokeWidth: number; strokeOpacity: number };
  edgeSelected: { stroke: string; strokeWidth: number; strokeOpacity: number };
  edgeHandle: { r: number; fill: string; stroke: string; strokeWidth: number };
  selectionBoundingBox: { fill: string; stroke: string; strokeWidth: number; strokeDasharray: string };
  resizeHandle: { r: number; fill: string; stroke: string; strokeWidth: number };
  dragEdge: { stroke: string; strokeWidth: number; strokeDasharray: string };
  selectionRect: { fill: string; stroke: string; strokeWidth: number; strokeDasharray: string };
  nodeDefault: { stroke: string; strokeWidth: number };
  nodeSnap: { stroke: string; strokeWidth: number };
  selectionBoundingBoxPad: number;
}

export function editorStyles(theme: CanvasTheme, k: number): EditorStyles {
  return {
    edgeHit: {
      strokeWidth: 12 / k,
    },
    edge: {
      stroke: 'currentColor',
      strokeWidth: 2 / k,
      strokeOpacity: 0.8,
    },
    edgeSelected: {
      stroke: theme.selection,
      strokeWidth: 3 / k,
      strokeOpacity: 0.8,
    },
    edgeHandle: {
      r: 6 / k,
      fill: theme.selection,
      stroke: theme.background,
      strokeWidth: 1.5 / k,
    },
    selectionBoundingBox: {
      fill: 'none',
      stroke: theme.selection,
      strokeWidth: 1.5 / k,
      strokeDasharray: `${5 / k},${3 / k}`,
    },
    resizeHandle: {
      r: 5 / k,
      fill: theme.background,
      stroke: theme.selection,
      strokeWidth: 1.5 / k,
    },
    dragEdge: {
      stroke: theme.connection,
      strokeWidth: 2 / k,
      strokeDasharray: `${6 / k},${4 / k}`,
    },
    selectionRect: {
      fill: theme.connection + '1a',
      stroke: theme.connection,
      strokeWidth: 1 / k,
      strokeDasharray: `${4 / k},${3 / k}`,
    },
    nodeDefault: { stroke: theme.nodeStroke, strokeWidth: 2 },
    nodeSnap: { stroke: theme.snapHighlight, strokeWidth: 3 },
    selectionBoundingBoxPad: 6 / k,
  };
}
