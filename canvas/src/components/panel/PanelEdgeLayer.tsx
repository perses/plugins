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
import { clipLineToNodes, edgeEndpoints, strokeWidthFromThresholds } from '../../utils/edgeUtils';
import { colorFromThresholds, interpolateLabel } from '../../utils/panelUtils';
import { EdgeLabel } from '../shared/EdgeLabel';
import type { LineStyle } from '../shared/EdgeLines';
import { EdgeLines, edgeLabelPoints } from '../shared/EdgeLines';

const NS_PREFIX = 'wm-panel';

function resolveEdgeStyle(
  series: TimeSeries | undefined,
  thicknessMode: ThicknessMode | undefined,
  edgeStrokeWidth: number | undefined,
  spec: CanvasSpec,
  paletteColors: string[],
  fallbackColor: string,
): { stroke: string; strokeWidth: number } {
  const defaultWidth = edgeStrokeWidth ?? spec.edgeDefaultStrokeWidth ?? 2;
  if (!series) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }
  const lastTuple = series.values[series.values.length - 1];
  const lastValue = lastTuple?.[1];
  if (lastValue === null || lastValue === undefined) {
    return { stroke: 'currentColor', strokeWidth: defaultWidth };
  }

  // Edges use their own color scheme when configured, falling back to the node thresholds so that
  // existing dashboards (which only set `thresholds`) keep their current edge colors.
  const edgeThresholds = spec.edgeThresholds ?? spec.thresholds;
  const stroke = edgeThresholds
    ? colorFromThresholds(lastValue, edgeThresholds, paletteColors, fallbackColor)
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
  /** Series backing generated edges (data-driven mode), keyed by edge id. Takes precedence over queryIndex. */
  seriesByItemId?: Map<string, TimeSeries>;
}

export function PanelEdgeLayer({
  spec,
  seriesByQueryIndex,
  k,
  paletteColors,
  seriesByItemId,
}: PanelEdgeLayerProps): ReactElement {
  const nodes = useMemo(() => spec.nodes ?? [], [spec.nodes]);
  const edges = useMemo(() => spec.edges ?? [], [spec.edges]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const { labelBackground, labelBorder, labelText, connection: fallbackColor } = useCanvasTheme();

  return (
    <>
      {edges.map((edge, i) => {
        const rawPts = edgeEndpoints(edge, nodeById);
        if (!rawPts) {
          return null;
        }

        // Trim each end that attaches to a node center (no explicit anchor) back to the node
        // boundary, so the line and arrowhead touch the shape instead of running into its center.
        const clipSource = edge.sourceAnchor ? undefined : nodeById.get(edge.source);
        const clipTarget = edge.target && !edge.targetAnchor ? nodeById.get(edge.target) : undefined;
        const pts = clipLineToNodes(rawPts, clipSource, clipTarget);

        const generatedSeries = seriesByItemId?.get(edge.id);

        function resolveSeries(queryIndex: number | undefined): TimeSeries | undefined {
          if (generatedSeries) {
            return generatedSeries;
          }
          return queryIndex !== undefined ? seriesByQueryIndex.get(queryIndex) : undefined;
        }

        function resolveLabel(series: TimeSeries | undefined, template: string | undefined): string | null {
          if (!series) {
            return null;
          }
          return interpolateLabel(template ?? '{{value}}', series, spec.format);
        }

        const fwdSeries = resolveSeries(edge.sourceQueryIndex);
        const bwdSeries = resolveSeries(edge.targetQueryIndex);

        const fwdStyle = resolveEdgeStyle(
          fwdSeries,
          edge.thicknessMode,
          edge.strokeWidth,
          spec,
          paletteColors,
          fallbackColor,
        );
        const bwdStyle = resolveEdgeStyle(
          bwdSeries,
          edge.thicknessMode,
          edge.strokeWidth,
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
        const fwdLabel = resolveLabel(fwdSeries, edge.sourceLabelTemplate);
        const bwdLabel = edge.bidirectional ? resolveLabel(bwdSeries, edge.targetLabelTemplate) : null;

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
