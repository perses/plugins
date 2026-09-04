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

import type { PointerEvent } from 'react';
import { useCallback, useState } from 'react';

import { useSpecContext } from '../contexts/SpecContext';
import { useZoomContext } from '../contexts/ZoomContext';
import type { AnchorPoint, EdgeSpec, CanvasSpec, EdgeEnd, Line, Point } from '../model';
import { anchorPosition, edgeEndpoints, pointInsideNode, snapTarget } from '../utils/edgeUtils';
import { generateId } from '../utils/generateId';

const SNAP_RADIUS = 20;

export interface SnapTarget {
  id: string;
  anchor: AnchorPoint;
}

export interface EditingEdge {
  id: string;
  end: EdgeEnd;
}

export interface DragEdge extends Line {
  sourceId: string;
  sourceAnchor: AnchorPoint;
  snapTarget?: SnapTarget;
  editingEdge?: EditingEdge;
}

interface SnapResult {
  node: { id: string };
  anchor: AnchorPoint;
}

function reconnectTarget(edge: EdgeSpec, snap: SnapResult | null, pt: Point): void {
  if (snap) {
    edge.target = snap.node.id;
    edge.targetAnchor = snap.anchor;
    edge.freeEndpoint = undefined;
  } else {
    edge.target = undefined;
    edge.targetAnchor = undefined;
    edge.freeEndpoint = pt;
  }
}

function reconnectSource(edge: EdgeSpec, snap: SnapResult | null, pt: Point): void {
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
    edge.freeEndpoint = pt;
    edge.target = undefined;
    edge.targetAnchor = undefined;
  } else {
    edge.freeEndpoint = pt;
  }
}

function buildNewEdge(dragEdge: DragEdge, snap: SnapResult | null, pt: Point): EdgeSpec {
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
    sourceAnchor: dragEdge.sourceAnchor,
    freeEndpoint: pt,
  };
}

interface UseEdgeConnectResult {
  dragEdge: DragEdge | null;
  beginEdgeDrag: (nodeId: string, anchor: AnchorPoint, point: Point) => void;
  beginEndpointDrag: (
    event: PointerEvent<SVGCircleElement>,
    edgeId: string,
    end: EdgeEnd,
    fixedPoint: Point,
    fixedNodeId: string,
    fixedAnchor: AnchorPoint,
  ) => boolean;
  updateEdgeDrag: (event: PointerEvent<SVGSVGElement>) => void;
  resetEdgeDrag: () => void;
  applyEdgeDrag: (draft: CanvasSpec) => void;
}

export function useEdgeConnect(): UseEdgeConnectResult {
  const { spec, nodeById, edgeById } = useSpecContext();
  const { toCanvasPoint } = useZoomContext();
  const [dragEdge, setDragEdge] = useState<DragEdge | null>(null);

  const beginEdgeDrag = useCallback((nodeId: string, anchor: AnchorPoint, point: Point): void => {
    setDragEdge({ sourceId: nodeId, sourceAnchor: anchor, start: point, end: point });
  }, []);

  const beginEndpointDrag = useCallback(
    (
      event: PointerEvent<SVGCircleElement>,
      edgeId: string,
      end: EdgeEnd,
      fixedPoint: Point,
      fixedNodeId: string,
      fixedAnchor: AnchorPoint,
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
      const movingPoint = end === 'target' ? pts.end : pts.start;
      setDragEdge({
        sourceId: fixedNodeId,
        sourceAnchor: fixedAnchor,
        start: fixedPoint,
        end: movingPoint,
        editingEdge: { id: edgeId, end },
      });
      return true;
    },
    [edgeById, nodeById],
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
          end: snap ? anchorPosition(snap.node, snap.anchor) : point,
          snapTarget: snap ? { id: snap.node.id, anchor: snap.anchor } : undefined,
        };
      });
    },
    [spec.nodes, toCanvasPoint],
  );

  const applyEdgeDrag = useCallback(
    (draft: CanvasSpec): void => {
      if (!dragEdge) {
        return;
      }
      const pt = dragEdge.end;
      const snapNode = dragEdge.snapTarget ? nodeById.get(dragEdge.snapTarget.id) : undefined;
      const snap =
        snapNode !== undefined && dragEdge.snapTarget !== undefined
          ? { node: snapNode, anchor: dragEdge.snapTarget.anchor }
          : null;

      if (dragEdge.editingEdge !== undefined) {
        const edge = (draft.edges ?? []).find((ed) => ed.id === dragEdge.editingEdge?.id);
        if (!edge) {
          return;
        }
        if (dragEdge.editingEdge.end === 'target') {
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
    [dragEdge, nodeById],
  );

  const resetEdgeDrag = useCallback((): void => {
    setDragEdge(null);
  }, []);

  return { dragEdge, beginEdgeDrag, beginEndpointDrag, updateEdgeDrag, resetEdgeDrag, applyEdgeDrag };
}
