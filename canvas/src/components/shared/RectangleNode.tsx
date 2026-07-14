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

import React, { ReactElement } from 'react';
import { NodeSpec } from '../../model';
import { ICON_PATHS } from '../../utils/icons';
import { labelAttrs } from '../../utils/labelPosition';
import { isSafeImageUrl } from '../../utils/panelUtils';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';

export const ICON_FILL_RATIO = 0.6;
export const CORNER_RADIUS_RATIO = 0.2;

export interface RectangleNodeProps {
  node: NodeSpec;
  displayLabel: string | undefined;
  defaultFill: string;
  fillOverride: string | undefined;
  rectProps?: React.SVGProps<SVGRectElement>;
}

export function RectangleNode({
  node,
  displayLabel,
  defaultFill,
  fillOverride,
  rectProps,
}: RectangleNodeProps): ReactElement {
  const { width, height } = node;
  const halfW = width / 2;
  const halfH = height / 2;
  const iconSize = Math.min(width, height) * ICON_FILL_RATIO;
  const iconScale = iconSize / 24;
  const cornerRadius = Math.min(width, height) * CORNER_RADIUS_RATIO;
  const lAttrs = labelAttrs(halfW, halfH, node.labelPosition, node.labelPadding);
  const { nodeStroke } = useCanvasTheme();
  const iconPath = node.icon ? ICON_PATHS[node.icon] : undefined;
  const fill = fillOverride ?? node.background ?? defaultFill;

  return (
    <>
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={height}
        rx={cornerRadius}
        ry={cornerRadius}
        fill={fill}
        stroke={nodeStroke}
        strokeWidth={2}
        {...rectProps}
      />
      {node.backgroundImage && isSafeImageUrl(node.backgroundImage) && (
        <image
          href={node.backgroundImage}
          x={-halfW}
          y={-halfH}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`inset(0 round ${cornerRadius}px)`}
          style={{ pointerEvents: 'none' }}
        />
      )}
      {iconPath && (
        <g
          transform={`translate(${-iconSize / 2},${-iconSize / 2}) scale(${iconScale})`}
          style={{ pointerEvents: 'none' }}
        >
          <path d={iconPath} fill={nodeStroke} />
        </g>
      )}
      {displayLabel && (
        <text
          x={lAttrs.x}
          y={lAttrs.y}
          textAnchor={lAttrs.textAnchor}
          dominantBaseline={lAttrs.dominantBaseline}
          fill="currentColor"
          fontSize={12}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {displayLabel}
        </text>
      )}
    </>
  );
}
