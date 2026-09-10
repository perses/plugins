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

import type { TimeSeries } from '@perses-dev/spec';
import type { ReactElement } from 'react';
import { useMemo } from 'react';

import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import type { CanvasSpec, ThicknessMode } from '../../model';
import { edgeEndpoints, strokeWidthFromThresholds } from '../../utils/edgeUtils';
import { colorFromThresholds, interpolateLabel } from '../../utils/panelUtils';
import { EdgeLabel } from '../shared/EdgeLabel';
import type { LineStyle } from '../shared/EdgeLines';
import { EdgeLines, edgeLabelPoints } from '../shared/EdgeLines';

const NS_PREFIX = 'wm-panel';

function resolveEdgeStyle(
  queryIndex: number | undefined,
  thicknessMode: ThicknessMode | undefined,
  edgeStrokeWidth: number | undefined,
  seriesByQueryIndex: Map<number, TimeSeries>,
  spec: CanvasSpec,
  paletteColors: string[],
  fallbackColor: string,
): { stroke: string; strokeWidth: number } {
  const defaultWidth = edgeStrokeWidth ?? spec.edgeDefaultStrokeWidth ?? 2;
  if (queryIndex === undefined) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }
  const series = seriesByQueryIndex.get(queryIndex);
  if (!series) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }
  const lastTuple = series.values[series.values.length - 1];
  const lastValue = lastTuple?.[1];
  if (lastValue === null || lastValue === undefined) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }

  const stroke = spec.thresholds
    ? colorFromThresholds(lastValue, spec.thresholds, paletteColors, fallbackColor)
    : 'currentColor';
  const strokeWidth =
    thicknessMode === 'threshold' && spec.edgeThresholdWidths?.length
      ? strokeWidthFromThresholds(lastValue, spec.edgeThresholdWidths, defaultWidth)
      : defaultWidth;
  return { stroke, strokeWidth };
}

interface PanelEdgeLayerProps {
  spec: CanvasSpec;
  seriesByQueryIndex: Map<number, TimeSeries>;
  k: number;
  paletteColors: string[];
}

export function PanelEdgeLayer({ spec, seriesByQueryIndex, k, paletteColors }: PanelEdgeLayerProps): ReactElement {
  const nodes = useMemo(() => spec.nodes ?? [], [spec.nodes]);
  const edges = useMemo(() => spec.edges ?? [], [spec.edges]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const { labelBackground, labelBorder, labelText, connection: fallbackColor } = useCanvasTheme();

  return (
    <>
      {edges.map((edge, i) => {
        const pts = edgeEndpoints(edge, nodeById);
        if (!pts) {
          return null;
        }

        function resolveLabel(queryIndex: number | undefined, template: string | undefined): string | null {
          if (queryIndex === undefined) {
            return null;
          }
          const series = seriesByQueryIndex.get(queryIndex);
          if (!series) {
            return null;
          }
          return interpolateLabel(template ?? '{{value}}', series, spec.format);
        }

        const fwdStyle = resolveEdgeStyle(
          edge.sourceQueryIndex,
          edge.thicknessMode,
          edge.strokeWidth,
          seriesByQueryIndex,
          spec,
          paletteColors,
          fallbackColor,
        );
        const bwdStyle = resolveEdgeStyle(
          edge.targetQueryIndex,
          edge.thicknessMode,
          edge.strokeWidth,
          seriesByQueryIndex,
          spec,
          paletteColors,
          fallbackColor,
        );
        const scaledFwdStyle: LineStyle = {
          stroke: fwdStyle.stroke,
          strokeWidth: fwdStyle.strokeWidth / k,
          strokeOpacity: 0.8,
        };
        const scaledBwdStyle: LineStyle = {
          stroke: bwdStyle.stroke,
          strokeWidth: bwdStyle.strokeWidth / k,
          strokeOpacity: 0.8,
        };

        const labelPts = edgeLabelPoints(
          pts,
          edge.bidirectional ?? false,
          scaledFwdStyle.strokeWidth,
          scaledBwdStyle.strokeWidth,
        );
        const fwdLabel = resolveLabel(edge.sourceQueryIndex, edge.sourceLabelTemplate);
        const bwdLabel = edge.bidirectional ? resolveLabel(edge.targetQueryIndex, edge.targetLabelTemplate) : null;

        return (
          <g key={edge.id}>
            <EdgeLines
              pts={pts}
              bidirectional={edge.bidirectional ?? false}
              nsPrefix={`${NS_PREFIX}-${i}`}
              fwdStyle={scaledFwdStyle}
              bwdStyle={scaledBwdStyle}
              lineProps={{ style: { pointerEvents: 'none' } }}
            />
            {fwdLabel ? (
              <EdgeLabel
                position={labelPts.fwd}
                text={fwdLabel}
                k={k}
                background={labelBackground}
                border={labelBorder}
                color={labelText}
              />
            ) : null}
            {bwdLabel && labelPts.bwd ? (
              <EdgeLabel
                position={labelPts.bwd}
                text={bwdLabel}
                k={k}
                background={labelBackground}
                border={labelBorder}
                color={labelText}
              />
            ) : null}
          </g>
        );
      })}
    </>
  );
}
