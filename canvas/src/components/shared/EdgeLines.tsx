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
import { midpoint } from '../../utils/edgeUtils';

type Line = { x1: number; y1: number; x2: number; y2: number };

interface EdgeGeometry {
  fwd: Line;
  bwd: Line | null;
}

function shortenEnd(line: Line, amount: number): Line {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const len = Math.hypot(dx, dy);
  if (len <= amount) return line;
  const t = (len - amount) / len;
  return { x1: line.x1, y1: line.y1, x2: line.x1 + dx * t, y2: line.y1 + dy * t };
}

function computeEdgeGeometry(
  pts: Line,
  bidirectional: boolean,
  fwdStrokeWidth: number,
  bwdStrokeWidth: number
): EdgeGeometry {
  const fwdShorten = ARROW_SW_W * fwdStrokeWidth;
  const bwdShorten = ARROW_SW_W * bwdStrokeWidth;

  if (!bidirectional) {
    return { fwd: shortenEnd(pts, fwdShorten), bwd: null };
  }
  const mid = midpoint(pts);
  return {
    fwd: shortenEnd({ x1: pts.x1, y1: pts.y1, x2: mid.x, y2: mid.y }, fwdShorten),
    bwd: shortenEnd({ x1: pts.x2, y1: pts.y2, x2: mid.x, y2: mid.y }, bwdShorten),
  };
}

const ARROW_SW_W = 2.5;
const ARROW_SW_H = 1.75;

export interface LineStyle {
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
}

function markerId(nsPrefix: string, direction: 'fwd' | 'bwd'): string {
  return `${nsPrefix}-arrow-${direction}`;
}

interface EdgeArrowMarkerProps {
  nsPrefix: string;
  direction: 'fwd' | 'bwd';
  fill: string;
}

function EdgeArrowMarker({ nsPrefix, direction, fill }: EdgeArrowMarkerProps): ReactElement {
  return (
    <marker
      id={markerId(nsPrefix, direction)}
      markerWidth={ARROW_SW_W}
      markerHeight={ARROW_SW_H}
      refY={ARROW_SW_H / 2}
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d={`M0,0 L0,${ARROW_SW_H} L${ARROW_SW_W},${ARROW_SW_H / 2} z`} fill={fill} />
    </marker>
  );
}

interface EdgeLinesProps {
  pts: Line;
  bidirectional: boolean;
  nsPrefix: string;
  fwdStyle: LineStyle;
  bwdStyle?: LineStyle;
  lineProps?: React.SVGProps<SVGLineElement>;
}

export function EdgeLines({
  pts,
  bidirectional,
  nsPrefix,
  fwdStyle,
  bwdStyle,
  lineProps,
}: EdgeLinesProps): ReactElement {
  const resolvedBwdStyle = bwdStyle ?? fwdStyle;
  const { fwd, bwd } = computeEdgeGeometry(pts, bidirectional, fwdStyle.strokeWidth, resolvedBwdStyle.strokeWidth);

  return (
    <>
      <defs>
        <EdgeArrowMarker nsPrefix={nsPrefix} direction="fwd" fill={fwdStyle.stroke} />
        {bwd && <EdgeArrowMarker nsPrefix={nsPrefix} direction="bwd" fill={resolvedBwdStyle.stroke} />}
      </defs>
      <line
        x1={fwd.x1}
        y1={fwd.y1}
        x2={fwd.x2}
        y2={fwd.y2}
        stroke={fwdStyle.stroke}
        strokeWidth={fwdStyle.strokeWidth}
        strokeOpacity={fwdStyle.strokeOpacity}
        markerEnd={`url(#${markerId(nsPrefix, 'fwd')})`}
        {...lineProps}
      />
      {bwd && (
        <line
          x1={bwd.x1}
          y1={bwd.y1}
          x2={bwd.x2}
          y2={bwd.y2}
          stroke={resolvedBwdStyle.stroke}
          strokeWidth={resolvedBwdStyle.strokeWidth}
          strokeOpacity={resolvedBwdStyle.strokeOpacity}
          markerEnd={`url(#${markerId(nsPrefix, 'bwd')})`}
          {...lineProps}
        />
      )}
    </>
  );
}

export function edgeLabelPoints(
  pts: Line,
  bidirectional: boolean,
  fwdStrokeWidth: number,
  bwdStrokeWidth: number
): { fwd: { x: number; y: number }; bwd: { x: number; y: number } | null } {
  const { fwd, bwd } = computeEdgeGeometry(pts, bidirectional, fwdStrokeWidth, bwdStrokeWidth);
  return { fwd: midpoint(fwd), bwd: bwd ? midpoint(bwd) : null };
}
