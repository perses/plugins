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

import { useSelection } from '@perses-dev/components';
import { startTransition, useCallback, useEffect } from 'react';

import type { Span, Trace } from './trace';

/**
 * A span passed to item actions, based on the OTLP types of the Span model (e.g. attributes are OTLP KeyValue lists).
 * Unlike the Span model, it does not reference its parent and child spans, so it can be serialized.
 */
export type SpanActionSpan = Omit<Span, 'parentSpan' | 'childSpans'>;

/**
 * The trace of a span passed to item actions.
 * It summarizes the trace, to keep the payload small when all spans of a trace are selected.
 */
export interface SpanActionTrace {
  traceId: string;
  startTimeUnixMs: number;
  endTimeUnixMs: number;
  spanCount: number;
}

/**
 * Data of a span passed to item actions, which can be referenced in templates,
 * e.g. ${__data.fields["span.name"]} or ${__data.fields["trace.startTimeUnixMs"]}.
 * Declared as a type (not an interface), so it is assignable to the DataItem of the item actions.
 */
export type SpanActionData = {
  span: SpanActionSpan;
  trace: SpanActionTrace;
};

export function getSpanActionSpan(span: Span): SpanActionSpan {
  const { parentSpan: _parentSpan, childSpans: _childSpans, ...serializableSpan } = span;
  return serializableSpan;
}

export function getSpanActionTrace(trace: Trace, traceId: string): SpanActionTrace {
  return {
    traceId,
    startTimeUnixMs: trace.startTimeUnixMs,
    endTimeUnixMs: trace.endTimeUnixMs,
    spanCount: trace.spanById.size,
  };
}

/**
 * getSpanActionData returns the data of a span and its trace, used as item data by the item actions.
 */
export function getSpanActionData(trace: Trace, span: Span): SpanActionData {
  return { span: getSpanActionSpan(span), trace: getSpanActionTrace(trace, span.traceId) };
}

/**
 * A span identified by its span ID, with its data passed to item actions.
 */
export interface SpanActionItem {
  id: string;
  data: SpanActionData;
}

export function getSpanActionItem(trace: Trace, span: Span): SpanActionItem {
  return { id: span.spanId, data: getSpanActionData(trace, span) };
}

export interface SpanSelection {
  enabled: boolean;
  isSelected: (spanId: string) => boolean;
  /** all spans of the trace are selected */
  allSelected: boolean;
  /** some, but not all spans of the trace are selected */
  someSelected: boolean;
  toggleSpan: (span: Span) => void;
  toggleAll: () => void;
}

/**
 * useSpanSelection exposes the checked spans as panel selection, e.g. for the item actions displayed in the panel header.
 * The selection is cleared when the selection is disabled or the gantt chart is unmounted,
 * e.g. when another trace is loaded (the gantt chart is keyed by trace ID).
 */
export function useSpanSelection(trace: Trace, enabled: boolean): SpanSelection {
  const { selectionMap, setSelection, toggleSelection, clearSelection } = useSelection<SpanActionData, string>();

  // the selection is stored in the panel's SelectionProvider, which outlives the gantt chart
  useEffect(() => {
    if (!enabled) return;
    return clearSelection;
  }, [enabled, clearSelection]);

  const isSelected = useCallback((spanId: string) => enabled && selectionMap.has(spanId), [enabled, selectionMap]);

  const toggleSpan = useCallback(
    (span: Span) => toggleSelection(getSpanActionData(trace, span), span.spanId),
    [trace, toggleSelection],
  );

  const selectedCount = enabled ? selectionMap.size : 0;
  const allSelected = selectedCount > 0 && selectedCount === trace.spanById.size;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
      return;
    }
    const spans = Array.from(trace.spanById.values());
    const firstSpan = spans[0];
    if (!firstSpan) return;
    // all spans share the same trace object, instead of a copy per span
    const actionTrace = getSpanActionTrace(trace, firstSpan.traceId);
    const items = spans.map((span) => ({
      id: span.spanId,
      item: { span: getSpanActionSpan(span), trace: actionTrace },
    }));
    // selecting all spans of a large trace re-renders many rows, keep the UI responsive meanwhile
    startTransition(() => setSelection(items));
  }, [allSelected, trace, setSelection, clearSelection]);

  return { enabled, isSelected, allSelected, someSelected, toggleSpan, toggleAll };
}
