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
import { memo, useCallback } from 'react';

import type { AnchorPoint, EdgeEnd, EdgeSpec, NodeSpec } from '../../model';
import { EditorEdge } from './EditorEdge';

interface EditorEdgeItemProps {
  edge: EdgeSpec;
  isSelected: boolean;
  isDragging: boolean;
  nsPrefix: string;
  nodeById: Map<string, NodeSpec>;
  selectItems: (ids: Set<string>) => void;
  beginEndpointDrag: (
    event: PointerEvent<SVGCircleElement>,
    edgeId: string,
    end: EdgeEnd,
    fixedX: number,
    fixedY: number,
    fixedNodeId: string,
    fixedAnchor: AnchorPoint,
  ) => boolean;
  startDragEdge: () => void;
}

export const EditorEdgeItem = memo(function EditorEdgeItem({
  edge,
  isSelected,
  isDragging,
  nsPrefix,
  nodeById,
  selectItems,
  beginEndpointDrag,
  startDragEdge,
}: EditorEdgeItemProps): ReactElement | null {
  const edgeId = edge.id;

  const onEdgeClick = useCallback(
    (event: PointerEvent<SVGLineElement>): void => {
      event.stopPropagation();
      selectItems(new Set([edgeId]));
    },
    [edgeId, selectItems],
  );

  const onEndpointPointerDown = useCallback(
    (
      event: PointerEvent<SVGCircleElement>,
      end: EdgeEnd,
      fixedX: number,
      fixedY: number,
      fixedNodeId: string,
      fixedAnchor: AnchorPoint,
    ): void => {
      if (beginEndpointDrag(event, edgeId, end, fixedX, fixedY, fixedNodeId, fixedAnchor)) {
        startDragEdge();
      }
    },
    [edgeId, beginEndpointDrag, startDragEdge],
  );

  return (
    <EditorEdge
      edge={edge}
      isSelected={isSelected}
      isDragging={isDragging}
      nsPrefix={nsPrefix}
      nodeById={nodeById}
      onEdgeClick={onEdgeClick}
      onEndpointPointerDown={onEndpointPointerDown}
    />
  );
});
