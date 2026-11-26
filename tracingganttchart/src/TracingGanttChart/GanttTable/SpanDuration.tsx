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

import { Box, Tooltip, useTheme } from '@mui/material';
import { useChartsTheme } from '@perses-dev/components';
import type { ReactElement } from 'react';

import type { TracingGanttChartOptions } from '../../gantt-chart-model';
import { Ticks } from '../Ticks';
import type { Event, Span } from '../trace';
import type { Viewport } from '../utils';
import { formatDuration, getSpanColor, minSpanWidthPx } from '../utils';

export interface SpanDurationProps {
  options: TracingGanttChartOptions;
  span: Span;
  viewport: Viewport;
  /** called with the index of the event in `span.events` when an event marker is clicked */
  onEventClick?: (span: Span, eventIndex: number) => void;
}

const eventMarkerSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  boxSizing: 'border-box',
  width: '10px',
  height: '18px',
  // the padding widens the click target, the background is only painted on the content box
  padding: '0 4px',
  border: 'none',
  backgroundColor: 'text.primary',
  backgroundClip: 'content-box',
  cursor: 'pointer',
  '&:hover, &:focus-visible': {
    paddingInline: '3px',
  },
} as const;

/**
 * SpanDuration renders the right column of a SpanRow, i.e. the span bar and span duration
 */
export function SpanDuration(props: SpanDurationProps): ReactElement {
  const { options, span, viewport, onEventClick } = props;
  const muiTheme = useTheme();
  const chartsTheme = useChartsTheme();

  const spanDuration = span.endTimeUnixMs - span.startTimeUnixMs;
  const viewportDuration = viewport.endTimeUnixMs - viewport.startTimeUnixMs;
  const relativeDuration = spanDuration / viewportDuration;
  const relativeStart = (span.startTimeUnixMs - viewport.startTimeUnixMs) / viewportDuration;

  return (
    <Box sx={{ position: 'relative', height: '100%', flexGrow: 1, overflow: 'hidden' }}>
      <Ticks />
      <Box
        data-testid="span-duration-bar"
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          margin: 'auto',
          minWidth: `${minSpanWidthPx}px`,
          height: '8px',
          borderRadius: muiTheme.shape.borderRadius,
        }}
        style={{
          left: `${relativeStart * 100}%`,
          width: `${relativeDuration * 100}%`,
          backgroundColor: getSpanColor(muiTheme, chartsTheme, options.visual?.palette?.mode, span),
        }}
      />
      {getEventMarkers(span).map(({ key, event, index }) => (
        <Tooltip key={key} title={event.name} placement="top">
          <Box
            component="button"
            type="button"
            aria-label={`Event ${event.name}`}
            tabIndex={
              event.timeUnixMs >= viewport.startTimeUnixMs && event.timeUnixMs <= viewport.endTimeUnixMs ? 0 : -1
            }
            sx={eventMarkerSx}
            style={{ left: `${((event.timeUnixMs - viewport.startTimeUnixMs) / viewportDuration) * 100}%` }}
            onClick={(e) => {
              if (!onEventClick) return;
              e.stopPropagation();
              onEventClick(span, index);
            }}
          />
        </Tooltip>
      ))}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '0 8px',
          color: muiTheme.palette.grey[700],
          fontSize: '.7rem',
        }}
        style={
          /* print span duration on right side of the span bar, if there is space */
          relativeStart + relativeDuration < 0.95
            ? {
                left: `${(relativeStart + relativeDuration) * 100}%`,
              }
            : {
                left: `${relativeStart * 100}%`,
                transform: 'translateY(-50%) translateX(-100%)',
              }
        }
      >
        {formatDuration(spanDuration)}
      </Box>
    </Box>
  );
}

interface EventMarker {
  key: string;
  event: Event;
  /** index of the event in `span.events` */
  index: number;
}

/**
 * getEventMarkers returns one marker per event of the span.
 * Events with the same name and time would be rendered at the same position, therefore only the first one is kept.
 */
function getEventMarkers(span: Span): EventMarker[] {
  const markers = new Map<string, EventMarker>();
  span.events.forEach((event, index) => {
    const key = `${event.timeUnixMs}:${event.name}`;
    if (!markers.has(key)) {
      markers.set(key, { key, event, index });
    }
  });
  return [...markers.values()];
}
