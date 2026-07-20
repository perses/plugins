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
import {
  BoundingBox,
  HANDLE_POSITIONS,
  handlePosition,
  RESIZE_CURSORS,
  RESIZE_HANDLE_IDS,
  ResizeHandleId,
} from '../../utils/resizeUtils';
import { editorStyles } from '../../utils/editorStyles';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { useZoomContext } from '../../contexts/ZoomContext';

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

  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bh} {...theme.selectionBoundingBox} style={{ pointerEvents: 'none' }} />
      {RESIZE_HANDLE_IDS.map((h) => {
        const pos = handlePosition(paddedBoundingBox, h);
        return (
          <circle
            key={h}
            cx={pos.x}
            cy={pos.y}
            {...theme.resizeHandle}
            style={{ cursor: RESIZE_CURSORS[h] }}
            onPointerDown={(event) => onResizeHandlePointerDown(event, h)}
          />
        );
      })}
    </g>
  );
}

export { HANDLE_POSITIONS };
