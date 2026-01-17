// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { filterToTraceQL } from './filter_to_traceql';
import { traceQLToFilter } from './traceql_to_filter';

describe('TraceQL query', () => {
  it.each([
    {
      query: '{}',
      expected: {
        serviceName: [],
        spanName: [],
        namespace: [],
        status: [],
        spanDuration: {},
        traceDuration: {},
        customMatchers: [],
      },
    },
    {
      query: '{ status = ok }',
      expected: {
        serviceName: [],
        spanName: [],
        namespace: [],
        status: ['ok'],
        spanDuration: {},
        traceDuration: {},
        customMatchers: [],
      },
    },
    {
      query:
        '{ resource.service.name =~ "service1|service2" && name = "span\\"name" && (status = ok || status = unset) && span.http.status_code>=200 && span.http.method="GE T" }',
      expected: {
        serviceName: ['service1', 'service2'],
        spanName: ['span"name'],
        namespace: [],
        status: ['ok', 'unset'],
        spanDuration: {},
        traceDuration: {},
        customMatchers: ['span.http.status_code>=200', 'span.http.method="GE T"'],
      },
    },
    {
      query: '{ span.http.status_code=200 && span.http.method="GET" && event:name="test" }',
      expected: {
        serviceName: [],
        spanName: [],
        namespace: [],
        status: [],
        spanDuration: {},
        traceDuration: {},
        customMatchers: ['span.http.status_code=200', 'span.http.method="GET"', 'event:name="test"'],
      },
    },
    {
      query: '{ name = "service \\\\ \\" end" && span.http.route="/some/regex \\\\ \\" end" }',
      expected: {
        serviceName: [],
        spanName: ['service \\ " end'],
        namespace: [],
        status: [],
        spanDuration: {},
        traceDuration: {},
        // custom matcher values are not escaped
        customMatchers: ['span.http.route="/some/regex \\\\ \\" end"'],
      },
    },
  ])('parse $query', ({ query, expected }) => {
    const filter = traceQLToFilter(query);
    expect(filter).toEqual(expected);
    expect(filterToTraceQL(filter)).toEqual(query);
  });
});
