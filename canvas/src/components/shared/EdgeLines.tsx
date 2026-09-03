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

import type { ReactElement } from 'react';
import React from 'react';

import type { Line, Point } from '../../model';
import { midpoint } from '../../utils/edgeUtils';

interface EdgeGeometry {
  fwd: Line;
  bwd: Line | null;
}

function shortenEnd(line: Line, amount: number): Line {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const len = Math.hypot(dx, dy);
  if (len <= amount) return line;
  const t = (len - amount) / len;
  return { start: line.start, end: { x: line.start.x + dx * t, y: line.start.y + dy * t } };
}

function computeEdgeGeometry(
  pts: Line,
  bidirectional: boolean,
  fwdStrokeWidth: number,
  bwdStrokeWidth: number,
): EdgeGeometry {
  const fwdShorten = ARROW_SW_W * fwdStrokeWidth;
  const bwdShorten = ARROW_SW_W * bwdStrokeWidth;

  if (!bidirectional) {
    return { fwd: shortenEnd(pts, fwdShorten), bwd: null };
  }
  const mid = midpoint(pts);
  return {
    fwd: shortenEnd({ start: pts.start, end: mid }, fwdShorten),
    bwd: shortenEnd({ start: pts.end, end: mid }, bwdShorten),
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
        {bwd ? <EdgeArrowMarker nsPrefix={nsPrefix} direction="bwd" fill={resolvedBwdStyle.stroke} /> : null}
      </defs>
      <line
        x1={fwd.start.x}
        y1={fwd.start.y}
        x2={fwd.end.x}
        y2={fwd.end.y}
        stroke={fwdStyle.stroke}
        strokeWidth={fwdStyle.strokeWidth}
        strokeOpacity={fwdStyle.strokeOpacity}
        markerEnd={`url(#${markerId(nsPrefix, 'fwd')})`}
        {...lineProps}
      />
      {bwd ? (
        <line
          x1={bwd.start.x}
          y1={bwd.start.y}
          x2={bwd.end.x}
          y2={bwd.end.y}
          stroke={resolvedBwdStyle.stroke}
          strokeWidth={resolvedBwdStyle.strokeWidth}
          strokeOpacity={resolvedBwdStyle.strokeOpacity}
          markerEnd={`url(#${markerId(nsPrefix, 'bwd')})`}
          {...lineProps}
        />
      ) : null}
    </>
  );
}

export function edgeLabelPoints(
  pts: Line,
  bidirectional: boolean,
  fwdStrokeWidth: number,
  bwdStrokeWidth: number,
): { fwd: Point; bwd: Point | null } {
  const { fwd, bwd } = computeEdgeGeometry(pts, bidirectional, fwdStrokeWidth, bwdStrokeWidth);
  return { fwd: midpoint(fwd), bwd: bwd ? midpoint(bwd) : null };
}
