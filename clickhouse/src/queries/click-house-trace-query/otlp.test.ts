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

import { stubResponse } from '../../test/stubs';
import { buildTrace } from './otlp';

const COLUMNS: Array<[string, string]> = [
  ['Timestamp', 'DateTime64(9)'],
  ['TraceId', 'String'],
  ['SpanId', 'String'],
  ['ParentSpanId', 'String'],
  ['SpanName', 'LowCardinality(String)'],
  ['SpanKind', 'LowCardinality(String)'],
  ['ServiceName', 'LowCardinality(String)'],
  ['ResourceAttributes', 'Map(LowCardinality(String), String)'],
  ['ScopeName', 'String'],
  ['ScopeVersion', 'String'],
  ['SpanAttributes', 'Map(LowCardinality(String), String)'],
  ['Duration', 'UInt64'],
  ['StatusCode', 'LowCardinality(String)'],
  ['StatusMessage', 'String'],
  ['Events.Timestamp', 'Array(DateTime64(9))'],
  ['Events.Name', 'Array(LowCardinality(String))'],
  ['Events.Attributes', 'Array(Map(LowCardinality(String), String))'],
  ['Links.TraceId', 'Array(String)'],
  ['Links.SpanId', 'Array(String)'],
  ['Links.Attributes', 'Array(Map(LowCardinality(String), String))'],
];

const TRACE_ID = '5b8efff798038103d269b633813fc60c';

describe('buildTrace', () => {
  it('converts the spans of the OpenTelemetry traces table into an OTLP trace', () => {
    const trace = buildTrace(
      stubResponse(COLUMNS, [
        [
          '2026-01-01T10:00:00.000000001Z',
          TRACE_ID,
          'AAAA000000000001',
          '',
          'GET /cart',
          'Server',
          'frontend',
          { 'service.name': 'frontend', 'host.name': 'a' },
          'http',
          '1.2',
          { 'http.method': 'GET' },
          '2500000000',
          'Error',
          'boom',
          ['2026-01-01T10:00:01Z'],
          ['exception'],
          [{ 'exception.message': 'boom' }],
          ['11111111111111111111111111111111'],
          ['2222222222222222'],
          [{ reason: 'retry' }],
        ],
        [
          '2026-01-01T10:00:00.5Z',
          TRACE_ID,
          'aaaa000000000002',
          'aaaa000000000001',
          'query',
          'Client',
          'frontend',
          // The keys of a map do not always come in the same order.
          { 'host.name': 'a', 'service.name': 'frontend' },
          'http',
          '1.2',
          {},
          '1000',
          'Unset',
          '',
          [],
          [],
          [],
          [],
          [],
          [],
        ],
        [
          '2026-01-01T10:00:00.6Z',
          TRACE_ID,
          'bbbb000000000003',
          'aaaa000000000002',
          'SELECT',
          'SPAN_KIND_INTERNAL',
          'db',
          {},
          '',
          '',
          {},
          '1',
          'Ok',
          '',
          [],
          [],
          [],
          [],
          [],
          [],
        ],
      ]),
    );

    expect(trace.resourceSpans.map((resource) => resource.scopeSpans.map((scope) => scope.spans.length))).toEqual([
      // The two spans of the frontend share their resource and their scope.
      [2],
      [1],
    ]);
    expect(trace.resourceSpans[0]?.resource?.attributes).toEqual([
      { key: 'service.name', value: { stringValue: 'frontend' } },
      { key: 'host.name', value: { stringValue: 'a' } },
    ]);
    // The service name is a resource attribute even when the resource attributes do not hold it.
    expect(trace.resourceSpans[1]?.resource?.attributes).toEqual([
      { key: 'service.name', value: { stringValue: 'db' } },
    ]);
    expect(trace.resourceSpans[0]?.scopeSpans[0]?.scope).toEqual({ name: 'http', version: '1.2' });
    expect(trace.resourceSpans[0]?.scopeSpans[0]?.spans[0]).toEqual({
      traceId: TRACE_ID,
      spanId: 'aaaa000000000001',
      name: 'GET /cart',
      kind: 'SPAN_KIND_SERVER',
      // Nanoseconds, kept exact.
      startTimeUnixNano: '1767261600000000001',
      endTimeUnixNano: '1767261602500000001',
      attributes: [{ key: 'http.method', value: { stringValue: 'GET' } }],
      events: [
        {
          name: 'exception',
          timeUnixNano: '1767261601000000000',
          attributes: [{ key: 'exception.message', value: { stringValue: 'boom' } }],
        },
      ],
      links: [
        {
          traceId: '11111111111111111111111111111111',
          spanId: '2222222222222222',
          attributes: [{ key: 'reason', value: { stringValue: 'retry' } }],
        },
      ],
      status: { code: 'STATUS_CODE_ERROR', message: 'boom' },
    });
    const [, child] = trace.resourceSpans[0]?.scopeSpans[0]?.spans ?? [];
    expect(child).toMatchObject({
      parentSpanId: 'aaaa000000000001',
      kind: 'SPAN_KIND_CLIENT',
      status: { code: 'STATUS_CODE_UNSET' },
    });
    expect(trace.resourceSpans[1]?.scopeSpans[0]?.spans[0]).toMatchObject({
      kind: 'SPAN_KIND_INTERNAL',
      status: { code: 'STATUS_CODE_OK' },
    });
  });

  it('flattens the typed attributes of the JSON schema of the exporter', () => {
    const trace = buildTrace(
      stubResponse(
        [
          ['Timestamp', 'DateTime64(9)'],
          ['TraceId', 'String'],
          ['SpanId', 'String'],
          ['Duration', 'UInt64'],
          ['SpanAttributes', 'JSON'],
        ],
        [['2026-01-01T10:00:00Z', TRACE_ID, 'aaaa000000000001', '1', { http: { status_code: 200, ok: true } }]],
      ),
    );

    expect(trace.resourceSpans[0]?.scopeSpans[0]?.spans[0]?.attributes).toEqual([
      { key: 'http.status_code', value: { intValue: '200' } },
      { key: 'http.ok', value: { boolValue: true } },
    ]);
  });

  it('rejects a table that does not follow the OpenTelemetry schema', () => {
    expect(() => buildTrace(stubResponse([['Timestamp', 'DateTime64(9)']], [['2026-01-01T10:00:00Z']]))).toThrow(
      'The trace table has no "TraceId" column',
    );
  });
});
