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
import { BackgroundSpec } from '../../model';
import { imageFitToPreserveAspectRatio, isSafeImageUrl } from '../../utils/panelUtils';

interface GlobalBackgroundLayerProps {
  backgrounds: BackgroundSpec[];
  width: number;
  height: number;
}

export function GlobalBackgroundLayer({ backgrounds, width, height }: GlobalBackgroundLayerProps): ReactElement {
  return (
    <>
      {backgrounds
        .filter((bg) => bg.global)
        .map((bg) => (
          <g key={bg.id} style={{ pointerEvents: 'none', opacity: bg.opacity ?? 1 }}>
            <rect x={0} y={0} width={width} height={height} fill={bg.color ?? 'transparent'} stroke="none" />
            {bg.image && isSafeImageUrl(bg.image) && (
              <image
                href={bg.image}
                x={0}
                y={0}
                width={width}
                height={height}
                preserveAspectRatio={imageFitToPreserveAspectRatio(bg.imageFit)}
              />
            )}
          </g>
        ))}
    </>
  );
}

interface BackgroundLayerProps {
  backgrounds: BackgroundSpec[];
}

export function BackgroundLayer({ backgrounds }: BackgroundLayerProps): ReactElement {
  return (
    <>
      {backgrounds
        .filter((bg) => !bg.global)
        .map((bg) => (
          <g
            key={bg.id}
            transform={`translate(${bg.x},${bg.y})`}
            style={{ pointerEvents: 'none', opacity: bg.opacity ?? 1 }}
          >
            <rect x={0} y={0} width={bg.width} height={bg.height} fill={bg.color ?? 'transparent'} stroke="none" />
            {bg.image && isSafeImageUrl(bg.image) && (
              <image
                href={bg.image}
                x={0}
                y={0}
                width={bg.width}
                height={bg.height}
                preserveAspectRatio={imageFitToPreserveAspectRatio(bg.imageFit)}
              />
            )}
          </g>
        ))}
    </>
  );
}
