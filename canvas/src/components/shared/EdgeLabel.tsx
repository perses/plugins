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

const FONT_SIZE = 12;
const PADDING_X = 4;
const PADDING_Y = 2;
const HEIGHT = FONT_SIZE + PADDING_Y * 2;

interface EdgeLabelProps {
  x: number;
  y: number;
  text: string;
  k?: number;
  background: string;
  border: string;
  color: string;
}

export function EdgeLabel({ x, y, text, k = 1, background, border, color }: EdgeLabelProps): ReactElement {
  const approxWidth = text.length * FONT_SIZE * 0.55 + PADDING_X * 2;
  const scale = 1 / k;

  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <rect
        x={-approxWidth / 2}
        y={-HEIGHT / 2}
        width={approxWidth}
        height={HEIGHT}
        fill={background}
        stroke={border}
        strokeWidth={1}
        rx={HEIGHT / 2}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE}
        fontStyle="italic"
        fill={color}
      >
        {text}
      </text>
    </g>
  );
}
