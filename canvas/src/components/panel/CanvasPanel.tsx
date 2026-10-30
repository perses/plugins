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
import { useCallback, useMemo, useState } from 'react';

import { useZoomContext, ZoomProvider } from '../../contexts/ZoomContext';
import { useZoom } from '../../hooks/useZoom';
import type { CanvasProps, CanvasSpec, Point } from '../../model';
import { buildGraphFromQueries } from '../../utils/graphGeneration';
import { layoutGraph } from '../../utils/graphLayout';
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
  reverseSeriesByItemId?: Map<string, TimeSeries>;
}

function PanelSvg({
  svgRef,
  spec,
  contentDimensions,
  seriesByQueryIndex,
  paletteColors,
  seriesByItemId,
  reverseSeriesByItemId,
}: PanelSvgProps): ReactElement {
  const { transform, isPanning, fitView, resetPan } = useZoomContext();

  const nodes = useMemo(() => spec.nodes ?? [], [spec.nodes]);
  const backgrounds = useMemo(() => spec.backgrounds ?? [], [spec.backgrounds]);

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
          spec={spec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
          seriesByItemId={seriesByItemId}
        />
        <PanelEdgeLayer
          spec={spec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
          seriesByItemId={seriesByItemId}
          reverseSeriesByItemId={reverseSeriesByItemId}
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

  // The force simulation is expensive (O(n²) per iteration) and must not rerun when only metric
  // values change. Cache just the origin-centered positions (keyed by node id) for a given topology,
  // using React's sanctioned "adjust state during render" pattern: a value-only refresh keeps the
  // same topologyKey and reuses the cached positions, so the simulation reruns only when the set of
  // nodes/edges actually changes. Caching positions rather than whole node specs means appearance
  // edits (default size, labels) still flow through from the freshly generated nodes below.
  const [layoutCache, setLayoutCache] = useState<{ key: string; positions: Map<string, Point> } | undefined>(undefined);
  let positions = layoutCache?.positions;
  if (generated && layoutCache?.key !== generated.topologyKey) {
    positions = new Map(layoutGraph(generated.nodes, generated.edges).map((node) => [node.id, node.position]));
    setLayoutCache({ key: generated.topologyKey, positions });
  } else if (!generated && layoutCache) {
    positions = undefined;
    setLayoutCache(undefined);
  }

  const effectiveSpec: CanvasSpec = useMemo(() => {
    if (!generated || !positions) {
      return spec;
    }
    // layoutGraph centers the generated graph on the origin (0, 0). Under the identity zoom
    // transform the origin is the SVG's top-left corner, so the graph would render clipped into that
    // corner. Offset every node by the viewport center so the graph sits in the middle of the panel.
    // Apply the cached position onto the freshly generated node (keeping its current label/size), so
    // appearance edits take effect without rerunning the simulation.
    const offsetX = (props.contentDimensions?.width ?? 600) / 2;
    const offsetY = (props.contentDimensions?.height ?? 400) / 2;
    const nodes = generated.nodes.map((node) => {
      const pos = positions.get(node.id) ?? node.position;
      return { ...node, position: { x: pos.x + offsetX, y: pos.y + offsetY } };
    });
    return { ...spec, nodes, edges: generated.edges };
  }, [spec, generated, positions, props.contentDimensions?.width, props.contentDimensions?.height]);

  const { svgRef, toCanvasPoint, transform, isPanning, fitView, resetPan } = useZoom();

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
        reverseSeriesByItemId={generated?.reverseSeriesByItemId}
      />
    </ZoomProvider>
  );
}
