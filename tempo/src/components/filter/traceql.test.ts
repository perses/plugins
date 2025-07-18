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
  ])('parse $query', ({ query, expected }) => {
    const filter = traceQLToFilter(query);
    expect(filter).toEqual(expected);
    expect(filterToTraceQL(filter)).toEqual(query);
  });
});
