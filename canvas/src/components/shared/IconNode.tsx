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

import { ReactElement, SVGProps } from 'react';
import { NodeSpec } from '../../model';
import { ICON_PATHS } from '../../utils/icons';
import { labelAttrs } from '../../utils/labelPosition';

export interface IconNodeProps {
  node: NodeSpec;
  displayLabel: string | undefined;
  defaultFill: string;
  fillOverride: string | undefined;
  rectProps?: SVGProps<SVGRectElement>;
}

export function IconNode({ node, displayLabel, defaultFill, fillOverride, rectProps }: IconNodeProps): ReactElement {
  const { width, height } = node;
  const halfW = width / 2;
  const halfH = height / 2;
  const iconPath = node.icon ? ICON_PATHS[node.icon] : undefined;
  const iconScale = Math.min(width, height) / 24;
  const lAttrs = labelAttrs(halfW, halfH, node.labelPosition, node.labelPadding);
  const iconColor = fillOverride ?? defaultFill;

  return (
    <>
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={height}
        fill="transparent"
        stroke="transparent"
        {...rectProps}
      />
      {iconPath ? (
        <g transform={`translate(${-halfW},${-halfH}) scale(${iconScale})`} style={{ pointerEvents: 'none' }}>
          <path d={iconPath} fill={iconColor} />
        </g>
      ) : (
        <ellipse rx={halfW} ry={halfH} fill={iconColor} style={{ pointerEvents: 'none' }} />
      )}
      {displayLabel && (
        <text
          x={lAttrs.x}
          y={lAttrs.y}
          textAnchor={lAttrs.textAnchor}
          dominantBaseline={lAttrs.dominantBaseline}
          fill="currentColor"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {displayLabel}
        </text>
      )}
    </>
  );
}
