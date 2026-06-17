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

import { Box, useTheme } from '@mui/material';
import { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle, ListRange } from 'react-virtuoso';

import { CustomLinks, TracingGanttChartOptions } from '../../gantt-chart-model';
import { Span, Trace, forEachSpan } from '../trace';
import { Viewport } from '../utils';
import { GanttTableHeader } from './GanttTableHeader';
import { useGanttTableContext } from './GanttTableProvider';
import { GanttTableRow } from './GanttTableRow';
import { ResizableDivider } from './ResizableDivider';

export interface GanttTableProps {
  options: TracingGanttChartOptions;
  customLinks?: CustomLinks;
  trace: Trace;
  viewport: Viewport;
  selectedSpan?: Span;
  onSpanClick: (span: Span) => void;
  matchingSpanIds?: string[];
  focusedSpanId?: string;
}

export function GanttTable(props: GanttTableProps): ReactElement {
  const { options, customLinks, trace, viewport, selectedSpan, onSpanClick, matchingSpanIds, focusedSpanId } = props;
  const { collapsedSpans, setCollapsedSpans, setVisibleSpans } = useGanttTableContext();
  const [nameColumnWidth, setNameColumnWidth] = useState<number>(0.25);
  const tableRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const theme = useTheme();

  // Recursively flatten the span tree to a list of rows, hiding collapsed child spans.
  const rows = useMemo(() => {
    const rows: Span[] = [];
    forEachSpan(trace.rootSpans, (span) => {
      rows.push(span);
      if (collapsedSpans.has(span.spanId)) {
        return false;
      }
    });
    return rows;
  }, [trace.rootSpans, collapsedSpans]);
  const matchingSpanIdSet = useMemo(() => new Set(matchingSpanIds ?? []), [matchingSpanIds]);

  // Auto-expand collapsed ancestors when focusing a search match
  useEffect(() => {
    if (!focusedSpanId) return;

    const span = trace.spanById.get(focusedSpanId);
    if (!span) return;

    const ancestorIds = new Set<string>();
    let parent = span.parentSpan;
    while (parent) {
      ancestorIds.add(parent.spanId);
      parent = parent.parentSpan;
    }
    if (ancestorIds.size > 0) {
      setCollapsedSpans((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const id of ancestorIds) {
          if (next.delete(id)) changed = true;
        }
        return changed ? next : prev;
      });
    }
  }, [focusedSpanId, trace.spanById, setCollapsedSpans]);

  // Scroll to focused span when using prev/next buttons in search bar.
  useEffect(() => {
    if (!focusedSpanId || !virtuosoRef.current) return;

    const index = rows.findIndex((r) => r.spanId === focusedSpanId);
    if (index >= 0) {
      virtuosoRef.current.scrollToIndex({ index, align: 'center' });
    }
  }, [focusedSpanId, rows]);

  // Set the top most index in the Virtuoso table to the selected span
  // Required e.g. when navigating from another page.
  const initialTopMostSpanIndex = useMemo(() => {
    if (!selectedSpan) return 0;
    const index = rows.findIndex((r) => r.spanId === selectedSpan.spanId);
    return index >= 0 ? index : 0;
  }, [rows, selectedSpan]);

  const divider = <ResizableDivider parentRef={tableRef} onMove={setNameColumnWidth} />;

  // update currently visible spans
  function handleRangeChange({ startIndex, endIndex }: ListRange): void {
    const visibleSpans: string[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleSpans.push(rows[i]!.spanId);
    }
    setVisibleSpans(visibleSpans);
  }

  return (
    <Box
      ref={tableRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.borderRadius}px`,
      }}
    >
      <GanttTableHeader trace={trace} viewport={viewport} nameColumnWidth={nameColumnWidth} divider={divider} />
      <Virtuoso
        ref={virtuosoRef}
        data={rows}
        initialTopMostItemIndex={initialTopMostSpanIndex}
        itemContent={(_, span) => (
          <GanttTableRow
            options={options}
            customLinks={customLinks}
            span={span}
            viewport={viewport}
            selected={span === selectedSpan}
            matched={matchingSpanIdSet.has(span.spanId)}
            focused={span.spanId === focusedSpanId}
            nameColumnWidth={nameColumnWidth}
            divider={divider}
            onClick={onSpanClick}
          />
        )}
        rangeChanged={handleRangeChange}
      />
    </Box>
  );
}
