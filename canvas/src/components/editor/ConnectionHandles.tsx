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

import { ReactElement } from 'react';
import { NodeSpec, AnchorPoint } from '../../model';
import { ANCHOR_KEYS, anchorPosition } from '../../utils/edgeUtils';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';

const CROSS_LENGTH = 8;

interface ConnectionHandlesProps {
  node: NodeSpec;
  onDragStart: (anchor: AnchorPoint, x: number, y: number) => void;
}

export function ConnectionHandles({ node, onDragStart }: ConnectionHandlesProps): ReactElement {
  const { connection } = useCanvasTheme();
  const armLen = CROSS_LENGTH;

  return (
    <>
      {ANCHOR_KEYS.map((anchor) => {
        const pos = anchorPosition(node, anchor);
        return (
          <g
            key={anchor}
            transform={`translate(${pos.x},${pos.y})`}
            style={{ cursor: 'crosshair' }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onDragStart(anchor, pos.x, pos.y);
            }}
          >
            <circle r={armLen} fill="transparent" />
            <line x1={-armLen / 2} y1={0} x2={armLen / 2} y2={0} stroke={connection} strokeWidth={1.5} />
            <line x1={0} y1={-armLen / 2} x2={0} y2={armLen / 2} stroke={connection} strokeWidth={1.5} />
            <circle r={2} fill={connection} />
          </g>
        );
      })}
    </>
  );
}
