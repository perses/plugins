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

import { PointerEvent, ReactElement, useCallback } from 'react';

import { useZoomContext } from '../../contexts/ZoomContext';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { editorStyles } from '../../utils/editorStyles';
import {
  BoundingBox,
  HANDLE_POSITIONS,
  handlePosition,
  RESIZE_CURSORS,
  RESIZE_HANDLE_IDS,
  ResizeHandleId,
} from '../../utils/resizeUtils';

const NO_POINTER_EVENTS = { pointerEvents: 'none' } as const;
const HANDLE_CURSOR_STYLES = Object.fromEntries(
  RESIZE_HANDLE_IDS.map((h) => [h, { cursor: RESIZE_CURSORS[h] }]),
) as Record<ResizeHandleId, { cursor: string }>;

interface SelectionBoundingBoxProps {
  boundingBox: BoundingBox;
  onResizeHandlePointerDown: (event: PointerEvent<SVGCircleElement>, handleId: ResizeHandleId) => void;
}

export function SelectionBoundingBox({
  boundingBox,
  onResizeHandlePointerDown,
}: SelectionBoundingBoxProps): ReactElement {
  const {
    transform: { k },
  } = useZoomContext();
  const theme = editorStyles(useCanvasTheme(), k);
  const pad = theme.selectionBoundingBoxPad;
  const bx = boundingBox.minX - pad;
  const by = boundingBox.minY - pad;
  const bw = boundingBox.maxX - boundingBox.minX + pad * 2;
  const bh = boundingBox.maxY - boundingBox.minY + pad * 2;
  const paddedBoundingBox: BoundingBox = { minX: bx, minY: by, maxX: bx + bw, maxY: by + bh };

  const makeHandlerPointerDown = useCallback(
    (h: ResizeHandleId) =>
      (event: PointerEvent<SVGCircleElement>): void => {
        onResizeHandlePointerDown(event, h);
      },
    [onResizeHandlePointerDown],
  );

  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bh} {...theme.selectionBoundingBox} style={NO_POINTER_EVENTS} />
      {RESIZE_HANDLE_IDS.map((h) => {
        const pos = handlePosition(paddedBoundingBox, h);
        return (
          <circle
            key={h}
            cx={pos.x}
            cy={pos.y}
            {...theme.resizeHandle}
            style={HANDLE_CURSOR_STYLES[h]}
            onPointerDown={makeHandlerPointerDown(h)}
          />
        );
      })}
    </g>
  );
}

export { HANDLE_POSITIONS };
