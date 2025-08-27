import { DurationField, Filter } from './filter';

/**
 * Construct a TraceQL query from a filter.
 * 1. Creates the matchers, for example 'resource.service.name = "some_value"' or 'resource.service.name =~ "some_value|other_value"'
 * 2. Join all matchers with '&&'
 * 3. Return the full TraceQL query, for example '{ resource.service.name = "some_value" && name = "span_name" }'
 */
export function filterToTraceQL(filter: Filter) {
  const matchers: string[] = [
    ...stringMatcher('resource.service.name', filter.serviceName),
    ...stringMatcher('name', filter.spanName),
    ...stringMatcher('resource.k8s.namespace.name', filter.namespace),
    ...intrinsicMatcher('status', filter.status),
    ...durationMatcher('duration', filter.spanDuration),
    ...durationMatcher('traceDuration', filter.traceDuration),
    ...customMatcher(filter.customMatchers),
  ];

  if (matchers.length === 0) {
    return '{}';
  }
  return `{ ${matchers.join(' && ')} }`;
}

function escape(q: string) {
  return q.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function stringMatcher(attribute: string, values: string[]) {
  const escapedValues = values.map(escape);
  if (escapedValues.length > 1) {
    return [`${attribute} =~ "${escapedValues.join('|')}"`];
  } else if (escapedValues.length == 1) {
    return [`${attribute} = "${escapedValues[0]}"`];
  }
  return [];
}

function intrinsicMatcher(attribute: string, values: string[]) {
  const orConds = values.map((x) => `${attribute} = ${x}`);
  if (orConds.length > 1) {
    return ['(' + orConds.join(' || ') + ')'];
  } else if (orConds.length === 1) {
    return orConds;
  } else {
    return [];
  }
}

function durationMatcher(attribute: string, value: DurationField) {
  const matchers = [];
  if (value.min) {
    matchers.push(`${attribute} >= ${value.min}`);
  }
  if (value.max) {
    matchers.push(`${attribute} <= ${value.max}`);
  }
  return matchers;
}

function customMatcher(customMatchers: string[]) {
  return customMatchers;
}
