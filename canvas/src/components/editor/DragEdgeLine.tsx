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

import { ReactElement } from 'react';
import { DragEdge } from '../../hooks/useEdgeConnect';
import { editorStyles } from '../../utils/editorStyles';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { useZoomContext } from '../../contexts/ZoomContext';
import { EdgeLines } from '../shared/EdgeLines';

const NS_PREFIX = 'wm-drag-edge';

interface DragEdgeLineProps {
  dragEdge: DragEdge;
}

export function DragEdgeLine({ dragEdge }: DragEdgeLineProps): ReactElement {
  const {
    transform: { k },
  } = useZoomContext();
  const theme = editorStyles(useCanvasTheme(), k);
  const pts = { x1: dragEdge.x1, y1: dragEdge.y1, x2: dragEdge.x2, y2: dragEdge.y2 };
  return (
    <EdgeLines
      pts={pts}
      bidirectional={false}
      nsPrefix={NS_PREFIX}
      fwdStyle={{
        stroke: theme.dragEdge.stroke,
        strokeWidth: theme.dragEdge.strokeWidth,
      }}
      lineProps={{ strokeDasharray: theme.dragEdge.strokeDasharray, style: { pointerEvents: 'none' } }}
    />
  );
}
