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

import { useChartsTheme } from '@perses-dev/components';
import type { ThresholdOptions } from '@perses-dev/components';
import type { TimeSeries } from '@perses-dev/spec';
import type { MouseEvent, ReactElement } from 'react';
import { useCallback, useMemo } from 'react';

import { useZoomContext, ZoomProvider } from '../../contexts/ZoomContext';
import { useZoom } from '../../hooks/useZoom';
import type { CanvasProps, CanvasSpec } from '../../model';
import { buildGraphFromQueries } from '../../utils/graphGeneration';
import { layoutGraph } from '../../utils/graphLayout';
import { scaleFromThresholds } from '../../utils/panelUtils';
import { nodeBoundingBox } from '../../utils/resizeUtils';
import { BackgroundLayer, GlobalBackgroundLayer } from '../shared/BackgroundLayer';
import { PanelEdgeLayer } from './PanelEdgeLayer';
import { PanelNodeLayer } from './PanelNodeLayer';
import { ThresholdLegend } from './ThresholdLegend';

const SVG_STYLE_BASE = { display: 'block' } as const;
const EMPTY_THRESHOLDS: ThresholdOptions = {};

interface PanelSvgProps {
  svgRef: (node: SVGSVGElement | null) => void;
  spec: CanvasSpec;
  contentDimensions: CanvasProps['contentDimensions'];
  seriesByQueryIndex: Map<number, TimeSeries>;
  paletteColors: string[];
  seriesByItemId?: Map<string, TimeSeries>;
}

function PanelSvg({
  svgRef,
  spec,
  contentDimensions,
  seriesByQueryIndex,
  paletteColors,
  seriesByItemId,
}: PanelSvgProps): ReactElement {
  const { transform, isPanning, fitView, resetPan } = useZoomContext();

  // Resolve node sizes up front so both layers share one geometry: nodes render at their scaled
  // size and edges clip to that same scaled boundary. Scaling only widens/heightens a node, which
  // keeps it centered on its position.
  const sizedSpec = useMemo(() => {
    const steps = spec.nodeThresholdSizes;
    const specNodes = spec.nodes ?? [];
    if (!steps?.length || !specNodes.some((n) => n.sizeMode === 'threshold')) {
      return spec;
    }
    const nextNodes = specNodes.map((node) => {
      if (node.sizeMode !== 'threshold') {
        return node;
      }
      const series =
        seriesByItemId?.get(node.id) ??
        (node.queryIndex !== undefined ? seriesByQueryIndex.get(node.queryIndex) : undefined);
      const lastValue = series?.values[series.values.length - 1]?.[1];
      if (lastValue === null || lastValue === undefined) {
        return node;
      }
      const scale = scaleFromThresholds(lastValue, steps);
      if (scale === 1) {
        return node;
      }
      return Object.assign({}, node, { width: node.width * scale, height: node.height * scale });
    });
    return { ...spec, nodes: nextNodes };
  }, [spec, seriesByItemId, seriesByQueryIndex]);

  const nodes = useMemo(() => sizedSpec.nodes ?? [], [sizedSpec.nodes]);
  const backgrounds = useMemo(() => sizedSpec.backgrounds ?? [], [sizedSpec.backgrounds]);

  const width = contentDimensions?.width ?? 600;
  const height = contentDimensions?.height ?? 400;

  const handleDoubleClick = useCallback(
    (event: MouseEvent<SVGSVGElement>): void => {
      if (event.ctrlKey || event.metaKey) {
        const boundingBox = nodeBoundingBox(nodes);
        if (boundingBox) {
          fitView(boundingBox, width, height);
        }
      } else {
        resetPan();
      }
    },
    [fitView, resetPan, nodes, width, height],
  );

  const showLegend = spec.legend !== undefined && spec.thresholds !== undefined;
  const thresholds = spec.thresholds ?? EMPTY_THRESHOLDS;
  const legendPosition = spec.legend?.position ?? 'bottom';
  const LEGEND_MARGIN = 8;
  const legendX = legendPosition === 'right' ? width - 118 - LEGEND_MARGIN : LEGEND_MARGIN;
  const legendY =
    legendPosition === 'right' ? LEGEND_MARGIN : height - ((spec.thresholds?.steps?.length ?? 0) + 1) * 18 - 24;

  const svgStyle = useMemo(() => ({ ...SVG_STYLE_BASE, cursor: isPanning ? 'grabbing' : 'grab' }), [isPanning]);

  return (
    <svg ref={svgRef} width={width} height={height} style={svgStyle} onDoubleClick={handleDoubleClick}>
      <GlobalBackgroundLayer backgrounds={backgrounds} width={width} height={height} />
      <g transform={transform.toString()}>
        <BackgroundLayer backgrounds={backgrounds} />
        <PanelNodeLayer
          spec={sizedSpec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
          seriesByItemId={seriesByItemId}
        />
        <PanelEdgeLayer
          spec={sizedSpec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
          seriesByItemId={seriesByItemId}
        />
      </g>

      {showLegend ? (
        <ThresholdLegend
          thresholds={thresholds}
          format={spec.format}
          paletteColors={paletteColors}
          position={{ x: legendX, y: legendY }}
        />
      ) : null}
    </svg>
  );
}

export function CanvasPanel(props: CanvasProps): ReactElement | null {
  const { queryResults, spec } = props;
  const chartsTheme = useChartsTheme();
  const paletteColors = chartsTheme.thresholds.palette;

  const seriesByQueryIndex = useMemo(() => {
    const map = new Map<number, TimeSeries>();
    queryResults.forEach((result, i) => {
      const first = result.data.series[0];
      if (first) {
        map.set(i, first);
      }
    });
    return map;
  }, [queryResults]);

  // Data-driven mode: derive nodes/edges from query results on every refresh, then lay them out
  // with a deterministic force simulation. Because layout is a pure function of the topology, nodes
  // settle to the same positions regardless of how metric values change between refreshes.
  const generation = spec.graphGeneration;
  const generated = useMemo(
    () => (generation?.enabled ? buildGraphFromQueries(generation, queryResults, spec.nodeDefaultSize) : undefined),
    [generation, queryResults, spec.nodeDefaultSize],
  );
  const effectiveSpec: CanvasSpec = useMemo(() => {
    if (!generated) {
      return spec;
    }
    // layoutGraph centers the generated graph on the origin (0, 0). Under the identity zoom
    // transform the origin is the SVG's top-left corner, so the graph would render clipped into that
    // corner. Offset every node by the viewport center so the graph sits in the middle of the panel.
    // layoutGraph returns freshly built node objects, so mutating position in place is safe here.
    const offsetX = (props.contentDimensions?.width ?? 600) / 2;
    const offsetY = (props.contentDimensions?.height ?? 400) / 2;
    const nodes = layoutGraph(generated.nodes, generated.edges);
    for (const node of nodes) {
      node.position = { x: node.position.x + offsetX, y: node.position.y + offsetY };
    }
    return { ...spec, nodes, edges: generated.edges };
  }, [spec, generated, props.contentDimensions?.width, props.contentDimensions?.height]);

  const { svgRef, toCanvasPoint, transform, isPanning, fitView, resetPan } = useZoom({ interactionMode: 'view' });

  const zoomValue = useMemo(
    () => ({ toCanvasPoint, transform, isPanning, fitView, resetPan }),
    [toCanvasPoint, transform, isPanning, fitView, resetPan],
  );

  return (
    <ZoomProvider value={zoomValue}>
      <PanelSvg
        svgRef={svgRef}
        spec={effectiveSpec}
        contentDimensions={props.contentDimensions}
        seriesByQueryIndex={seriesByQueryIndex}
        paletteColors={paletteColors}
        seriesByItemId={generated?.seriesByItemId}
      />
    </ZoomProvider>
  );
}
