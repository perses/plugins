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

import type { PointerEvent, ReactElement } from 'react';
import { useMemo } from 'react';

import { useZoomContext } from '../../contexts/ZoomContext';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import type { NodeSpec, AnchorPoint } from '../../model';
import { editorStyles } from '../../utils/editorStyles';
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

  const rectProps = useMemo(
    () => ({
      style: { cursor: 'move' } as const,
      ...(snapTarget ? theme.nodeSnap : theme.nodeDefault),
      onPointerDown,
      onPointerMove,
    }),
    [snapTarget, theme.nodeSnap, theme.nodeDefault, onPointerDown, onPointerMove],
  );

  return (
    <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <NodeRenderer node={node} defaultFill={wmTheme.nodeDefaultFill} rectProps={rectProps} />
      {isHovered && !isSelected && !isDragging ? (
        <ConnectionHandles node={node} onDragStart={onCrossDragStart} />
      ) : null}
    </g>
  );
}
