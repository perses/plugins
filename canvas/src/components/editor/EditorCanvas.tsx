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

import { KeyboardEvent, MouseEvent, PointerEvent, ReactElement, useCallback, useLayoutEffect, useMemo } from 'react';
import { produce } from 'immer';
import { AnchorPoint, CanvasSpec, FloatingEdge, isFloatingEdge } from '../../model';
import { nodeBoundingBox } from '../../utils/resizeUtils';
import { useZoomContext } from '../../contexts/ZoomContext';
import { useNodeMove } from '../../hooks/useNodeMove';
import { useEdgeConnect } from '../../hooks/useEdgeConnect';
import { useResize } from '../../hooks/useResize';
import { useRectSelect } from '../../hooks/useRectSelect';
import { useEditorContext } from '../../contexts/EditorContext';
import { useSpecContext } from '../../contexts/SpecContext';
import { BackgroundLayer, GlobalBackgroundLayer } from '../shared/BackgroundLayer';
import { EditorEdge } from './EditorEdge';
import { EditorNode } from './EditorNode';
import { SelectionBoundingBox } from './SelectionBoundingBox';
import { DragEdgeLine } from './DragEdgeLine';
import { SelectionRectOverlay } from './SelectionRectOverlay';

const NS_PREFIX = 'wm-editor';

function isActivePointerMove(event: PointerEvent): boolean {
  return event.buttons !== 0;
}

export function EditorCanvas({
  svgRef,
  width,
  height,
}: {
  svgRef: (node: SVGSVGElement | null) => void;
  width: number;
  height: number;
}): ReactElement {
  const { spec, updateSpec, deleteSelected } = useSpecContext();
  const {
    state,
    selectItems,
    hoverNode,
    unhoverNode,
    startSelectionRect,
    startMove,
    startDragEdge,
    startResize,
    endInteraction,
  } = useEditorContext();
  const { transform, fitView, resetPan } = useZoomContext();

  const { selectNode, updateMove, applyMove, resetMove } = useNodeMove();
  const { dragEdge, beginEdgeDrag, beginEndpointDrag, updateEdgeDrag, resetEdgeDrag, applyEdgeDrag } = useEdgeConnect();
  const { beginResize, updateResize, applyResize, resetResize } = useResize();
  const { beginSelection, updateSelection, applySelection, selectionRect } = useRectSelect();

  const { mode, selectedIds, hoveredId } = state;

  const unsavedSpec = useMemo((): CanvasSpec => {
    switch (mode.type) {
      case 'moving':
        return produce(spec, (draft) => applyMove(draft));
      case 'resizing':
        return produce(spec, (draft) => applyResize(draft));
      case 'dragging-edge':
        return produce(spec, (draft) => applyEdgeDrag(draft));
      default:
        return spec;
    }
  }, [mode, spec, applyMove, applyResize, applyEdgeDrag]);
  const displayNodes = useMemo(() => unsavedSpec.nodes ?? [], [unsavedSpec.nodes]);
  const displayEdges = useMemo(() => unsavedSpec.edges ?? [], [unsavedSpec.edges]);
  const nodeById = useMemo(() => new Map(displayNodes.map((n) => [n.id, n])), [displayNodes]);

  const selectionBoundingBox = useMemo(() => {
    const selectedNodes = displayNodes.filter((n) => selectedIds.has(n.id));
    const selectedFloatingEdges = displayEdges.filter(
      (ed): ed is FloatingEdge => selectedIds.has(ed.id) && isFloatingEdge(ed)
    );
    return (mode.type === 'idle' || mode.type === 'resizing') && selectedNodes.length >= 1
      ? nodeBoundingBox(
          selectedNodes,
          selectedFloatingEdges.map((ed) => ({ x: ed.x2, y: ed.y2 }))
        )
      : null;
  }, [displayEdges, displayNodes, mode.type, selectedIds]);

  useLayoutEffect(() => {
    if (displayNodes.length === 0) {
      return;
    }
    const bbox = nodeBoundingBox(displayNodes);
    if (bbox) {
      fitView(bbox, width, height);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitView, height, width]);

  const onSvgPointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      if (mode.type !== 'idle') {
        return;
      }
      if (beginSelection(event)) {
        startSelectionRect();
      }
    },
    [mode.type, beginSelection, startSelectionRect]
  );

  const onSvgPointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      if (!isActivePointerMove(event)) {
        return;
      }
      switch (mode.type) {
        case 'resizing':
          updateResize(event);
          break;
        case 'dragging-edge':
          updateEdgeDrag(event);
          break;
        case 'selecting':
          updateSelection(event);
          break;
      }
    },
    [mode.type, updateResize, updateEdgeDrag, updateSelection]
  );

  const clearInteractionState = useCallback((): void => {
    resetMove();
    resetResize();
    resetEdgeDrag();
  }, [resetMove, resetResize, resetEdgeDrag]);

  const onSvgPointerUp = useCallback((): void => {
    switch (mode.type) {
      case 'moving':
      case 'resizing':
      case 'dragging-edge': {
        updateSpec(unsavedSpec);
        clearInteractionState();
        endInteraction();
        break;
      }
      case 'selecting': {
        const ids = applySelection();
        selectItems(ids);
        endInteraction();
        break;
      }
    }
  }, [mode.type, updateSpec, unsavedSpec, clearInteractionState, endInteraction, applySelection, selectItems]);

  const onSvgDoubleClick = useCallback(
    (event: MouseEvent<SVGSVGElement>): void => {
      if (event.ctrlKey || event.metaKey) {
        const boundingBox = nodeBoundingBox(displayNodes);
        if (boundingBox) {
          fitView(boundingBox, width, height);
        }
      } else {
        resetPan();
      }
    },
    [displayNodes, fitView, resetPan, width, height]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<SVGSVGElement>): void => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }
      if (selectedIds.size > 0) {
        deleteSelected();
      }
    },
    [selectedIds, deleteSelected]
  );

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      tabIndex={0}
      style={{
        display: 'block',
        cursor: mode.type === 'dragging-edge' ? 'crosshair' : 'default',
        border: '1px solid',
        borderColor: 'divider',
        outline: 'none',
      }}
      onDoubleClick={onSvgDoubleClick}
      onKeyDown={onKeyDown}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <GlobalBackgroundLayer backgrounds={spec.backgrounds ?? []} width={width} height={height} />
      <g transform={transform.toString()}>
        <BackgroundLayer backgrounds={spec.backgrounds ?? []} />
        {displayNodes.map((node) => {
          const onNodePointerDown = (event: PointerEvent<SVGRectElement>): void => {
            const unselectedId = selectNode(event, node.id);
            if (unselectedId !== null) {
              selectItems(new Set([unselectedId]));
            } else {
              startMove();
            }
          };
          const onNodePointerMove = (event: PointerEvent<SVGRectElement>): void => {
            updateMove(event, node.id);
          };
          const onNodeMouseEnter = (): void => {
            if (mode.type !== 'dragging-edge') {
              hoverNode(node.id);
            }
          };
          const onNodeMouseLeave = (): void => unhoverNode(node.id);
          const onCrossDragStart = (anchor: AnchorPoint, x: number, y: number): void => {
            beginEdgeDrag(node.id, anchor, x, y);
            startDragEdge();
          };
          return (
            <EditorNode
              key={node.id}
              node={node}
              isHovered={hoveredId === node.id}
              isSelected={selectedIds.has(node.id)}
              snapTarget={dragEdge?.snapTargetId === node.id}
              isDragging={mode.type === 'dragging-edge'}
              onPointerDown={onNodePointerDown}
              onPointerMove={onNodePointerMove}
              onMouseEnter={onNodeMouseEnter}
              onMouseLeave={onNodeMouseLeave}
              onCrossDragStart={onCrossDragStart}
            />
          );
        })}

        {displayEdges.map((edge) => {
          const onEdgeClick = (event: PointerEvent<SVGLineElement>): void => {
            event.stopPropagation();
            selectItems(new Set([edge.id]));
          };
          const onEndpointPointerDown = (
            event: PointerEvent<SVGCircleElement>,
            end: 'source' | 'target',
            fixedX: number,
            fixedY: number,
            fixedNodeId: string,
            fixedAnchor: AnchorPoint
          ): void => {
            if (beginEndpointDrag(event, edge.id, end, fixedX, fixedY, fixedNodeId, fixedAnchor)) {
              startDragEdge();
            }
          };
          return (
            <EditorEdge
              key={edge.id}
              edge={edge}
              isSelected={!selectionBoundingBox && selectedIds.has(edge.id)}
              isDragging={mode.type === 'dragging-edge'}
              nsPrefix={`${NS_PREFIX}-${edge.id}`}
              nodeById={nodeById}
              onEdgeClick={onEdgeClick}
              onEndpointPointerDown={onEndpointPointerDown}
            />
          );
        })}

        {selectionBoundingBox && (
          <SelectionBoundingBox
            boundingBox={selectionBoundingBox}
            onResizeHandlePointerDown={(event, handleId) => {
              if (beginResize(event, handleId)) {
                startResize();
              }
            }}
          />
        )}

        {mode.type === 'dragging-edge' && dragEdge && <DragEdgeLine dragEdge={dragEdge} />}

        {selectionRect && <SelectionRectOverlay rect={selectionRect} />}
      </g>
    </svg>
  );
}
