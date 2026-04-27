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

import { Box, Divider, Portal, Stack, Typography } from '@mui/material';
import Pin from 'mdi-material-ui/Pin';
import PinOutline from 'mdi-material-ui/PinOutline';
import useResizeObserver from 'use-resize-observer';
import type { LineSeriesOption } from 'echarts';
import {
  assembleTransform,
  CursorCoordinates,
  getTooltipStyles,
  PIN_TOOLTIP_HELP_TEXT,
  TOOLTIP_BG_COLOR_FALLBACK,
  TOOLTIP_MAX_WIDTH,
  UNPIN_TOOLTIP_HELP_TEXT,
  useMousePosition,
} from '@perses-dev/components';
import { TimeSeriesAnnotation } from '../utils/annotation';

export interface AnnotationTooltipProps {
  annotation: TimeSeriesAnnotation;
  containerId?: string;
  formatWithUserTimeZone: (date: Date, formatString: string) => string;
  pinnedPos: CursorCoordinates | null;
  enablePinning?: boolean;
  onUnpinClick?: () => void;
}

export function AnnotationTooltip({
  annotation,
  containerId,
  formatWithUserTimeZone,
  pinnedPos,
  enablePinning = true,
  onUnpinClick,
}: AnnotationTooltipProps): JSX.Element | null {
  const mousePos = useMousePosition();
  const { height, width, ref: tooltipRef } = useResizeObserver<HTMLDivElement>();

  const isPinned = pinnedPos !== null;
  if (!isPinned && mousePos === null) return null;

  const containerElement = containerId ? document.querySelector(containerId) : undefined;
  const maxHeight = containerElement ? containerElement.getBoundingClientRect().height : undefined;
  const transform = assembleTransform(mousePos, pinnedPos, height ?? 0, width ?? 0, containerElement);

  const formatDate = (timeMs: number): { date: string; time: string } => {
    const d = new Date(timeMs);
    return {
      date: formatWithUserTimeZone(d, 'MMM dd, yyyy'),
      time: formatWithUserTimeZone(d, 'HH:mm:ss'),
    };
  };

  const start = formatDate(annotation.start);
  const end = annotation.end !== undefined ? formatDate(annotation.end) : null;

  return (
    <Portal container={containerElement}>
      <Box ref={tooltipRef} sx={(theme) => getTooltipStyles(theme, pinnedPos, maxHeight)} style={{ transform }}>
        <Stack spacing={0.5}>
          <Box
            sx={(theme) => ({
              width: '100%',
              maxWidth: TOOLTIP_MAX_WIDTH,
              padding: theme.spacing(1.5, 2, 0.5, 2),
              backgroundColor: theme.palette.designSystem?.grey[800] ?? TOOLTIP_BG_COLOR_FALLBACK,
              position: 'sticky',
              top: 0,
              left: 0,
            })}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', paddingBottom: 0.5, width: '100%' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: annotation.color ?? '#FF6B6B',
                  marginRight: 1,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="caption">
                  {start.date} - <strong>{start.time}</strong>
                </Typography>
                {end && (
                  <>
                    <Typography variant="caption">{' → '}</Typography>
                    <Typography variant="caption">
                      {end.date} - <strong>{end.time}</strong>
                    </Typography>
                  </>
                )}
              </Box>
              {enablePinning && (
                <Stack direction="row" alignItems="center" sx={{ marginLeft: 1, flexShrink: 0 }}>
                  <Typography sx={{ marginRight: 0.5, fontSize: 11, verticalAlign: 'middle' }}>
                    {isPinned ? UNPIN_TOOLTIP_HELP_TEXT : PIN_TOOLTIP_HELP_TEXT}
                  </Typography>
                  {isPinned ? (
                    <Pin
                      onClick={() => {
                        if (onUnpinClick !== undefined) onUnpinClick();
                      }}
                      sx={{ fontSize: 16, cursor: 'pointer' }}
                    />
                  ) : (
                    <PinOutline sx={{ fontSize: 16 }} />
                  )}
                </Stack>
              )}
            </Box>
            <Divider sx={(theme) => ({ width: '100%', borderColor: theme.palette.grey['500'] })} />
          </Box>
          <Box sx={(theme) => ({ padding: theme.spacing(0.5, 2, 1.5, 2) })}>
            {annotation.title && (
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', marginBottom: 0.5 }}>
                {annotation.title}
              </Typography>
            )}
            {annotation.legend && (
              <Typography variant="caption" sx={{ display: 'block', marginBottom: 0.5 }}>
                {annotation.legend}
              </Typography>
            )}
            {annotation.tags && Object.keys(annotation.tags).length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, marginTop: 0.5 }}>
                {Object.entries(annotation.tags).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={(theme) => ({
                      backgroundColor: theme.palette.grey['700'],
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                    })}
                  >
                    {key}: {value}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </Box>
    </Portal>
  );
}

/**
 * Build ECharts series options for rendering annotations as markArea (range),
 * markLine (vertical dashed lines) and markPoint (triangle markers under the X-axis).
 */
export function buildAnnotationSeries(annotations: TimeSeriesAnnotation[] | undefined): LineSeriesOption[] {
  if (!annotations || annotations.length === 0) return [];

  const markAreaData: Array<[{ xAxis: number; itemStyle?: { color: string; opacity: number } }, { xAxis: number }]> =
    [];
  const markLineData: Array<{
    xAxis: number;
    lineStyle?: { color: string; width: number; type: 'dashed' | 'solid' | 'dotted' };
    label?: { show: boolean };
    annotationIndex?: number;
  }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markPointData: any[] = [];

  annotations.forEach((annotation, index) => {
    const color = annotation.color ?? '#FF6B6B';
    const opacity = 0.3;

    if (annotation.end !== undefined) {
      // Range annotation - use markArea and markLine (silent) + markers at start/end
      markLineData.push({
        xAxis: annotation.start,
        lineStyle: { color, width: 2, type: 'dashed' as const },
        label: { show: false },
        annotationIndex: index,
      });

      markLineData.push({
        xAxis: annotation.end,
        lineStyle: { color, width: 2, type: 'dashed' as const },
        label: { show: false },
        annotationIndex: index,
      });

      markAreaData.push([
        {
          xAxis: annotation.start,
          itemStyle: { color, opacity },
        },
        { xAxis: annotation.end },
      ]);

      // Add start marker
      markPointData.push({
        coord: [annotation.start, 0],
        symbol: 'triangle',
        symbolSize: [12, 12],
        symbolRotate: 0,
        symbolOffset: [0, 4], // Position below X-axis
        itemStyle: { color },
        annotationIndex: index,
        emphasis: {
          disabled: true,
        },
        isStart: true,
      });

      // Add end marker
      markPointData.push({
        coord: [annotation.end, 0],
        symbol: 'triangle',
        symbolSize: [12, 12],
        symbolRotate: 0,
        symbolOffset: [0, 4], // Position below X-axis
        itemStyle: { color },
        annotationIndex: index,
        emphasis: {
          disabled: true,
        },
        isEnd: true,
      });
    } else {
      // Point annotation - use markLine (silent) + single marker
      markLineData.push({
        xAxis: annotation.start,
        lineStyle: { color, width: 2, type: 'dashed' as const },
        label: { show: false },
        annotationIndex: index,
      });

      // Add point marker
      markPointData.push({
        coord: [annotation.start, 0],
        symbol: 'triangle',
        symbolSize: [12, 10],
        symbolRotate: 0,
        symbolOffset: [0, '120%'], // Position below X-axis
        itemStyle: { color },
        annotationIndex: index,
        isPoint: true,
      });
    }
  });

  const series: LineSeriesOption = {
    type: 'line',
    data: [],
    silent: false,
    markArea:
      markAreaData.length > 0
        ? {
            silent: true, // Make area silent, only markers are interactive
            data: markAreaData,
            label: {
              show: false,
            },
          }
        : undefined,
    markLine:
      markLineData.length > 0
        ? {
            silent: true, // Non-interactive: hovering the dashed line keeps the TimeSeries tooltip
            symbol: ['none', 'none'],
            data: markLineData,
            lineStyle: {
              type: 'dashed',
            },
            emphasis: {
              disabled: true,
            },
          }
        : undefined,
    markPoint:
      markPointData.length > 0
        ? {
            silent: false, // Markers are interactive
            data: markPointData,
            label: {
              show: false,
            },
          }
        : undefined,
  };

  return [series];
}
