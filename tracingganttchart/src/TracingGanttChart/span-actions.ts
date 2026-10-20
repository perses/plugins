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
import type * as otlpcommonv1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/common/v1/common';
import { useEffect } from 'react';

import type { Span, Trace } from './trace';

/**
 * Data of a span passed to item actions.
 * Attributes are flattened with a prefix, so they can be referenced in templates,
 * e.g. ${__data.fields["attributes.http.method"]} or ${__data.fields["resource.service.name"]}.
 */
export type SpanActionData = Record<string, unknown>;

function getAttributeValue(value: otlpcommonv1.AnyValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('intValue' in value) return value.intValue;
  if ('doubleValue' in value) return value.doubleValue;
  if ('boolValue' in value) return value.boolValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(getAttributeValue);
  return undefined;
}

function addAttributes(data: SpanActionData, prefix: string, attributes: otlpcommonv1.KeyValue[]): void {
  for (const attribute of attributes) {
    data[`${prefix}.${attribute.key}`] = getAttributeValue(attribute.value);
  }
}

/**
 * getSpanActionData returns the data of a span and its trace, used as item data by the item actions.
 */
export function getSpanActionData(trace: Trace, span: Span): SpanActionData {
  const data: SpanActionData = {
    traceId: span.traceId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    name: span.name,
    kind: span.kind,
    serviceName: span.resource.serviceName,
    startTimeUnixMs: span.startTimeUnixMs,
    endTimeUnixMs: span.endTimeUnixMs,
    durationMs: span.endTimeUnixMs - span.startTimeUnixMs,
    statusCode: span.status.code,
    statusMessage: span.status.message,
    scopeName: span.scope.name,
    scopeVersion: span.scope.version,
    traceStartTimeUnixMs: trace.startTimeUnixMs,
    traceEndTimeUnixMs: trace.endTimeUnixMs,
  };
  addAttributes(data, 'resource', span.resource.attributes);
  addAttributes(data, 'attributes', span.attributes);
  return data;
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

export interface SpanSelectionSyncProps {
  item?: SpanActionItem;
}

/**
 * SpanSelectionSync exposes the selected span as panel selection, e.g. for the item actions displayed in the panel header.
 * It is a separate component, so that only this leaf subscribes to the selection context, and not the whole gantt chart.
 * The selection is cleared when the span is deselected or this component is unmounted.
 */
export function SpanSelectionSync({ item }: SpanSelectionSyncProps): null {
  const { setSelection, clearSelection } = useSelection<SpanActionData, string>();

  useEffect(() => {
    if (!item) return;
    setSelection([{ id: item.id, item: item.data }]);
    return clearSelection;
  }, [item, setSelection, clearSelection]);

  return null;
}
