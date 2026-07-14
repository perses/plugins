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
import { SelectionRect } from '../../hooks/useRectSelect';
import { editorStyles } from '../../utils/editorStyles';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { useZoomContext } from '../../contexts/ZoomContext';

interface SelectionRectOverlayProps {
  rect: SelectionRect;
}

export function SelectionRectOverlay({ rect }: SelectionRectOverlayProps): ReactElement {
  const {
    transform: { k },
  } = useZoomContext();
  const theme = editorStyles(useCanvasTheme(), k);
  const minX = Math.min(rect.x0, rect.x1);
  const minY = Math.min(rect.y0, rect.y1);
  const width = Math.abs(rect.x1 - rect.x0);
  const height = Math.abs(rect.y1 - rect.y0);
  return (
    <rect x={minX} y={minY} width={width} height={height} {...theme.selectionRect} style={{ pointerEvents: 'none' }} />
  );
}
