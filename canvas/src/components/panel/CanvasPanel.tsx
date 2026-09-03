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
import type { CanvasProps } from '../../model';
import { nodeBoundingBox } from '../../utils/resizeUtils';
import { BackgroundLayer, GlobalBackgroundLayer } from '../shared/BackgroundLayer';
import { PanelEdgeLayer } from './PanelEdgeLayer';
import { PanelNodeLayer } from './PanelNodeLayer';
import { ThresholdLegend } from './ThresholdLegend';

const SVG_STYLE = { display: 'block', cursor: 'grab' };
const EMPTY_THRESHOLDS: ThresholdOptions = {};

interface PanelSvgProps {
  svgRef: (node: SVGSVGElement | null) => void;
  props: CanvasProps;
  seriesByQueryIndex: Map<number, TimeSeries>;
  paletteColors: string[];
}

function PanelSvg({ svgRef, props, seriesByQueryIndex, paletteColors }: PanelSvgProps): ReactElement {
  const { contentDimensions, spec } = props;
  const { transform, fitView, resetPan } = useZoomContext();

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

  return (
    <svg ref={svgRef} width={width} height={height} style={SVG_STYLE} onDoubleClick={handleDoubleClick}>
      <GlobalBackgroundLayer backgrounds={backgrounds} width={width} height={height} />
      <g transform={transform.toString()}>
        <BackgroundLayer backgrounds={backgrounds} />
        <PanelNodeLayer
          spec={spec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
        />
        <PanelEdgeLayer
          spec={spec}
          seriesByQueryIndex={seriesByQueryIndex}
          k={transform.k}
          paletteColors={paletteColors}
        />
      </g>

      {showLegend ? (
        <ThresholdLegend
          thresholds={thresholds}
          format={spec.format}
          paletteColors={paletteColors}
          x={legendX}
          y={legendY}
        />
      ) : null}
    </svg>
  );
}

export function CanvasPanel(props: CanvasProps): ReactElement | null {
  const { queryResults } = props;
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

  const { svgRef, toCanvasPoint, transform, fitView, resetPan } = useZoom();

  const zoomValue = useMemo(
    () => ({ toCanvasPoint, transform, fitView, resetPan }),
    [toCanvasPoint, transform, fitView, resetPan],
  );

  return (
    <ZoomProvider value={zoomValue}>
      <PanelSvg svgRef={svgRef} props={props} seriesByQueryIndex={seriesByQueryIndex} paletteColors={paletteColors} />
    </ZoomProvider>
  );
}
