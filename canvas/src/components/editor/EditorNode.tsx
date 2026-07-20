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

import { PointerEvent, ReactElement } from 'react';
import { NodeSpec, AnchorPoint } from '../../model';
import { editorStyles } from '../../utils/editorStyles';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { useZoomContext } from '../../contexts/ZoomContext';
import { NodeRenderer } from '../shared/NodeRenderer';
import { ConnectionHandles } from './ConnectionHandles';

interface EditorNodeProps {
  node: NodeSpec;
  isHovered: boolean;
  isSelected: boolean;
  snapTarget: boolean;
  isDragging: boolean;
  onPointerDown: (event: PointerEvent<SVGRectElement>) => void;
  onPointerMove: (event: PointerEvent<SVGRectElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCrossDragStart: (anchor: AnchorPoint, x: number, y: number) => void;
}

export function EditorNode({
  node,
  isHovered,
  isSelected,
  snapTarget,
  isDragging,
  onPointerDown,
  onPointerMove,
  onMouseEnter,
  onMouseLeave,
  onCrossDragStart,
}: EditorNodeProps): ReactElement {
  const wmTheme = useCanvasTheme();
  const theme = editorStyles(wmTheme, useZoomContext().transform.k);
  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <NodeRenderer
        node={node}
        defaultFill={wmTheme.nodeDefaultFill}
        rectProps={{
          style: { cursor: 'move' },
          ...(snapTarget ? theme.nodeSnap : theme.nodeDefault),
          onPointerDown,
          onPointerMove,
        }}
      />
      {isHovered && !isSelected && !isDragging && <ConnectionHandles node={node} onDragStart={onCrossDragStart} />}
    </g>
  );
}
