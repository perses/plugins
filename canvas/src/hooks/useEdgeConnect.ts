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

import { PointerEvent, useCallback, useState } from 'react';
import { AnchorPoint, EdgeSpec, CanvasSpec } from '../model';
import { anchorPosition, edgeEndpoints, pointInsideNode, snapTarget } from '../utils/edgeUtils';
import { useZoomContext } from '../contexts/ZoomContext';
import { useSpecContext } from '../contexts/SpecContext';
import { generateId } from '../utils/generateId';

const SNAP_RADIUS = 20;

export interface DragEdge {
  sourceId: string;
  sourceAnchor: AnchorPoint;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  snapTargetId?: string;
  snapTargetAnchor?: AnchorPoint;
  editingEdgeId?: string;
  editingEnd?: 'source' | 'target';
}

interface SnapResult {
  node: { id: string };
  anchor: AnchorPoint;
}

function reconnectTarget(edge: EdgeSpec, snap: SnapResult | null, pt: { x: number; y: number }): void {
  if (snap) {
    edge.target = snap.node.id;
    edge.targetAnchor = snap.anchor;
    edge.x2 = undefined;
    edge.y2 = undefined;
  } else {
    edge.target = '';
    edge.targetAnchor = undefined;
    edge.x2 = pt.x;
    edge.y2 = pt.y;
  }
}

function reconnectSource(edge: EdgeSpec, snap: SnapResult | null, pt: { x: number; y: number }): void {
  if (snap) {
    edge.source = snap.node.id;
    edge.sourceAnchor = snap.anchor;
  } else if (edge.target) {
    // Swap source/target when dragging the source end to a free position:
    // the existing target becomes the new source, and the endpoint goes free.
    const oldTarget = edge.target;
    const oldTargetAnchor = edge.targetAnchor;
    edge.target = edge.source;
    edge.targetAnchor = edge.sourceAnchor;
    edge.source = oldTarget;
    edge.sourceAnchor = oldTargetAnchor;
    edge.x2 = pt.x;
    edge.y2 = pt.y;
    edge.target = '';
    edge.targetAnchor = undefined;
  } else {
    edge.x2 = pt.x;
    edge.y2 = pt.y;
  }
}

function buildNewEdge(dragEdge: DragEdge, snap: SnapResult | null, pt: { x: number; y: number }): EdgeSpec {
  const id = generateId('edge');
  if (snap) {
    return {
      id,
      source: dragEdge.sourceId,
      target: snap.node.id,
      sourceAnchor: dragEdge.sourceAnchor,
      targetAnchor: snap.anchor,
    };
  }
  return {
    id,
    source: dragEdge.sourceId,
    target: '',
    sourceAnchor: dragEdge.sourceAnchor,
    x2: pt.x,
    y2: pt.y,
  };
}

interface UseEdgeConnectResult {
  dragEdge: DragEdge | null;
  beginEdgeDrag: (nodeId: string, anchor: AnchorPoint, x: number, y: number) => void;
  beginEndpointDrag: (
    event: PointerEvent<SVGCircleElement>,
    edgeId: string,
    end: 'source' | 'target',
    fixedX: number,
    fixedY: number,
    fixedNodeId: string,
    fixedAnchor: AnchorPoint
  ) => boolean;
  updateEdgeDrag: (event: PointerEvent<SVGSVGElement>) => void;
  resetEdgeDrag: () => void;
  applyEdgeDrag: (draft: CanvasSpec) => void;
}

export function useEdgeConnect(): UseEdgeConnectResult {
  const { spec, nodeById, edgeById } = useSpecContext();
  const { toCanvasPoint } = useZoomContext();
  const [dragEdge, setDragEdge] = useState<DragEdge | null>(null);

  const beginEdgeDrag = useCallback((nodeId: string, anchor: AnchorPoint, x: number, y: number): void => {
    setDragEdge({ sourceId: nodeId, sourceAnchor: anchor, x1: x, y1: y, x2: x, y2: y });
  }, []);

  const beginEndpointDrag = useCallback(
    (
      event: PointerEvent<SVGCircleElement>,
      edgeId: string,
      end: 'source' | 'target',
      fixedX: number,
      fixedY: number,
      fixedNodeId: string,
      fixedAnchor: AnchorPoint
    ): boolean => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const edge = edgeById.get(edgeId);
      if (!edge) {
        return false;
      }
      const pts = edgeEndpoints(edge, nodeById);
      if (!pts) {
        return false;
      }
      const movingX = end === 'target' ? pts.x2 : pts.x1;
      const movingY = end === 'target' ? pts.y2 : pts.y1;
      setDragEdge({
        sourceId: fixedNodeId,
        sourceAnchor: fixedAnchor,
        x1: fixedX,
        y1: fixedY,
        x2: movingX,
        y2: movingY,
        editingEdgeId: edgeId,
        editingEnd: end,
      });
      return true;
    },
    [edgeById, nodeById]
  );

  const updateEdgeDrag = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      const point = toCanvasPoint(event);
      setDragEdge((current) => {
        if (!current) {
          return null;
        }
        const nodes = spec.nodes ?? [];
        const snap = snapTarget(nodes, point, current.sourceId, SNAP_RADIUS);
        return {
          ...current,
          x2: snap ? anchorPosition(snap.node, snap.anchor).x : point.x,
          y2: snap ? anchorPosition(snap.node, snap.anchor).y : point.y,
          snapTargetId: snap?.node.id,
          snapTargetAnchor: snap?.anchor,
        };
      });
    },
    [spec.nodes, toCanvasPoint]
  );

  const applyEdgeDrag = useCallback(
    (draft: CanvasSpec): void => {
      if (!dragEdge) {
        return;
      }
      const pt = { x: dragEdge.x2, y: dragEdge.y2 };
      const snapNode = dragEdge.snapTargetId ? nodeById.get(dragEdge.snapTargetId) : undefined;
      const snap =
        snapNode !== undefined && dragEdge.snapTargetAnchor !== undefined
          ? { node: snapNode, anchor: dragEdge.snapTargetAnchor }
          : null;

      if (dragEdge.editingEdgeId !== undefined && dragEdge.editingEnd !== undefined) {
        const edge = (draft.edges ?? []).find((ed) => ed.id === dragEdge.editingEdgeId);
        if (!edge) {
          return;
        }
        if (dragEdge.editingEnd === 'target') {
          reconnectTarget(edge, snap, pt);
        } else {
          reconnectSource(edge, snap, pt);
        }
      } else {
        const sourceNode = nodeById.get(dragEdge.sourceId);
        if (!snap && sourceNode && pointInsideNode(sourceNode, pt, SNAP_RADIUS)) {
          return;
        }
        (draft.edges ??= []).push(buildNewEdge(dragEdge, snap, pt));
      }
    },
    [dragEdge, nodeById]
  );

  const resetEdgeDrag = useCallback((): void => {
    setDragEdge(null);
  }, []);

  return { dragEdge, beginEdgeDrag, beginEndpointDrag, updateEdgeDrag, resetEdgeDrag, applyEdgeDrag };
}
