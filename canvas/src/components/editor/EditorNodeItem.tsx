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

import type { AnchorPoint, NodeSpec } from '../../model';
import { EditorNode } from './EditorNode';

interface EditorNodeItemProps {
  node: NodeSpec;
  isHovered: boolean;
  isSelected: boolean;
  snapTarget: boolean;
  isDragging: boolean;
  selectNode: (event: PointerEvent<SVGRectElement>, nodeId: string) => string | null;
  selectItems: (ids: Set<string>) => void;
  startMove: () => void;
  updateMove: (event: PointerEvent<SVGRectElement>, nodeId: string) => void;
  hoverNode: (nodeId: string) => void;
  unhoverNode: (nodeId: string) => void;
  beginEdgeDrag: (nodeId: string, anchor: AnchorPoint, x: number, y: number) => void;
  startDragEdge: () => void;
}

export const EditorNodeItem = memo(function EditorNodeItem({
  node,
  isHovered,
  isSelected,
  snapTarget,
  isDragging,
  selectNode,
  selectItems,
  startMove,
  updateMove,
  hoverNode,
  unhoverNode,
  beginEdgeDrag,
  startDragEdge,
}: EditorNodeItemProps): ReactElement {
  const nodeId = node.id;

  const onPointerDown = useCallback(
    (event: PointerEvent<SVGRectElement>): void => {
      const unselectedId = selectNode(event, nodeId);
      if (unselectedId !== null) {
        selectItems(new Set([unselectedId]));
      } else {
        startMove();
      }
    },
    [nodeId, selectNode, selectItems, startMove],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGRectElement>): void => {
      updateMove(event, nodeId);
    },
    [nodeId, updateMove],
  );

  const onMouseEnter = useCallback((): void => {
    if (!isDragging) {
      hoverNode(nodeId);
    }
  }, [isDragging, nodeId, hoverNode]);

  const onMouseLeave = useCallback((): void => {
    unhoverNode(nodeId);
  }, [nodeId, unhoverNode]);

  const onCrossDragStart = useCallback(
    (anchor: AnchorPoint, x: number, y: number): void => {
      beginEdgeDrag(nodeId, anchor, x, y);
      startDragEdge();
    },
    [nodeId, beginEdgeDrag, startDragEdge],
  );

  return (
    <EditorNode
      node={node}
      isHovered={isHovered}
      isSelected={isSelected}
      snapTarget={snapTarget}
      isDragging={isDragging}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onCrossDragStart={onCrossDragStart}
    />
  );
});
