// Copyright 2024 The Perses Authors
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

import { otlpcommonv1, otlpresourcev1, otlptracev1 } from '@perses-dev/core';

// the following Jaeger data types and parsing function should eventually be moved to a Jaeger data source plugin

export interface JaegerTrace {
  traceID: string;
  spans: Span[];
  processes: unknown;
  warnings: unknown;
}

interface Span {
  traceID: string;
  spanID: string;
  hasChildren: boolean;
  childSpanIds: string[];
  depth: number;
  processID: string;
  process: Process;

  operationName: string;
  /** start time in microseconds */
  startTime: number;
  relativeStartTime: number;
  duration: number;
  tags: Tag[];
  references: unknown;
  logs: unknown;
  warnings: unknown;
}

interface Process {
  serviceName: string;
  tags: Tag[];
}

type Tag =
  | {
      type: 'string';
      key: string;
      value: string;
    }
  | {
      type: 'int64';
      key: string;
      value: number;
    };

export function jaegerTraceToOTLP(jaegerTrace: JaegerTrace): otlptracev1.TracesData {
  return {
    resourceSpans: jaegerTrace.spans.map(buildResourceSpan),
  };
}

function buildResourceSpan(span: Span): otlptracev1.ResourceSpan {
  return {
    resource: buildResource(span.process),
    scopeSpans: [
      {
        scope: {
          name: '',
        },
        spans: [
          {
            traceId: span.traceID,
            spanId: span.spanID,
            name: span.operationName,
            kind: '',
            startTimeUnixNano: (span.startTime * 1000).toString(),
            endTimeUnixNano: ((span.startTime + span.duration) * 1000).toString(),
            attributes: span.tags.map(buildKeyValue),
            events: [],
            status: {},
          },
        ],
      },
    ],
  };
}

function buildResource(process: Process): otlpresourcev1.Resource {
  return {
    attributes: [
      { key: 'service.name', value: { stringValue: process.serviceName } },
      ...process.tags.map(buildKeyValue),
    ],
  };
}

function buildKeyValue(tag: Tag): otlpcommonv1.KeyValue {
  return { key: tag.key, value: buildAnyValue(tag) };
}

function buildAnyValue(tags: Tag): otlpcommonv1.AnyValue {
  switch (tags.type) {
    case 'string':
      return { stringValue: tags.value };
    case 'int64':
      return { intValue: tags.value.toString() };
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`unknown jaeger tag type ${(tags as any).type}`);
  }
}
