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

import { PointerEvent, ReactElement, useCallback, useMemo } from 'react';

import { useZoomContext } from '../../contexts/ZoomContext';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { AnchorPoint, EdgeSpec, NodeSpec } from '../../model';
import { edgeEndpoints } from '../../utils/edgeUtils';
import { editorStyles } from '../../utils/editorStyles';
import { EdgeLines, LineStyle } from '../shared/EdgeLines';

const POINTER_STYLE = { pointerEvents: 'none' } as const;
const LINE_PROPS = { style: POINTER_STYLE };
const CURSOR_POINTER = { cursor: 'pointer' } as const;
const CURSOR_GRAB = { cursor: 'grab' } as const;

interface EditorEdgeProps {
  edge: EdgeSpec;
  isSelected: boolean;
  isDragging: boolean;
  nsPrefix: string;
  nodeById: Map<string, NodeSpec>;
  onEdgeClick: (event: PointerEvent<SVGLineElement>) => void;
  onEndpointPointerDown: (
    event: PointerEvent<SVGCircleElement>,
    end: 'source' | 'target',
    fixedX: number,
    fixedY: number,
    fixedNodeId: string,
    fixedAnchor: AnchorPoint,
  ) => void;
}

export function EditorEdge({
  edge,
  isSelected,
  isDragging,
  nsPrefix,
  nodeById,
  onEdgeClick,
  onEndpointPointerDown,
}: EditorEdgeProps): ReactElement | null {
  const {
    transform: { k },
  } = useZoomContext();
  const theme = editorStyles(useCanvasTheme(), k);
  const pts = edgeEndpoints(edge, nodeById);

  const srcAnchor: AnchorPoint = edge.sourceAnchor ?? 'n';
  const tgtAnchor: AnchorPoint = edge.targetAnchor ?? 'n';

  const lineStyle: LineStyle = useMemo(() => {
    const rawStyle = isSelected ? theme.edgeSelected : theme.edge;
    return {
      stroke: rawStyle.stroke,
      strokeWidth: rawStyle.strokeWidth,
      strokeOpacity: rawStyle.strokeOpacity,
    };
  }, [isSelected, theme]);

  const onSourcePointerDown = useCallback(
    (event: PointerEvent<SVGCircleElement>): void => {
      if (!pts) return;
      onEndpointPointerDown(event, 'source', pts.x2, pts.y2, edge.target || edge.source, tgtAnchor);
    },
    [onEndpointPointerDown, pts, edge.target, edge.source, tgtAnchor],
  );

  const onTargetPointerDown = useCallback(
    (event: PointerEvent<SVGCircleElement>): void => {
      if (!pts) return;
      onEndpointPointerDown(event, 'target', pts.x1, pts.y1, edge.source, srcAnchor);
    },
    [onEndpointPointerDown, pts, edge.source, srcAnchor],
  );

  if (!pts || (isDragging && isSelected)) {
    return null;
  }

  return (
    <g>
      <line
        x1={pts.x1}
        y1={pts.y1}
        x2={pts.x2}
        y2={pts.y2}
        stroke="transparent"
        {...theme.edgeHit}
        style={CURSOR_POINTER}
        onPointerDown={onEdgeClick}
      />
      <EdgeLines
        pts={pts}
        bidirectional={edge.bidirectional ?? false}
        nsPrefix={nsPrefix}
        fwdStyle={lineStyle}
        lineProps={LINE_PROPS}
      />
      {isSelected && !isDragging ? (
        <>
          <circle
            cx={pts.x1}
            cy={pts.y1}
            {...theme.edgeHandle}
            style={CURSOR_GRAB}
            onPointerDown={onSourcePointerDown}
          />
          <circle
            cx={pts.x2}
            cy={pts.y2}
            {...theme.edgeHandle}
            style={CURSOR_GRAB}
            onPointerDown={onTargetPointerDown}
          />
        </>
      ) : null}
    </g>
  );
}
