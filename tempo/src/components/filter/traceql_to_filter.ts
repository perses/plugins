import { AttributeField, FieldExpression, FieldOp, IntrinsicField, Static, parser } from '@grafana/lezer-traceql';
import { DurationField, Filter } from './filter';

interface Matcher {
  operator: string;
  value: string;
}

/**
 * Construct a Filter from a TraceQL query.
 * 1. Parse the query (using Lezer library) and extract all matchers, e.g. 'some_attribute = "some_value"'
 * 2. Create the filter attribute values, a string array with a single value (for 'x = "y"') or multiple values (for 'x =~ "y|z"')
 * 3. Add the remaining matchers to the set of custom matchers.
 */
export function traceQLToFilter(query: string): Filter {
  const matchers = parseQuery(query);
  return {
    serviceName: reverseStringMatcher(matchers['resource.service.name']),
    spanName: reverseStringMatcher(matchers['name']),
    namespace: reverseStringMatcher(matchers['resource.k8s.namespace.name']),
    status: reverseIntrinsicMatcher(matchers['status']),
    spanDuration: reverseDurationMatcher(matchers['duration']),
    traceDuration: reverseDurationMatcher(matchers['traceDuration']),
    customMatchers: reverseCustomMatcher(
      matchers,
      new Set(['resource.service.name', 'name', 'resource.k8s.namespace.name', 'status', 'duration', 'traceDuration'])
    ),
  };
}

function parseQuery(query: string) {
  const matchers: Record<string, Matcher[]> = {};
  let attribute = '';
  let operator = '';
  let value = '';

  const syntaxTree = parser.parse(query);
  syntaxTree.iterate({
    enter(node) {
      switch (node.type.id) {
        case AttributeField:
          attribute = query.slice(node.from, node.to);
          return false;
        case IntrinsicField:
          attribute = query.slice(node.from, node.to);
          return false;
        case FieldOp:
          operator = query.slice(node.from, node.to);
          return false;
        case Static:
          value = query.slice(node.from, node.to);
          return false;
      }
    },
    leave(node) {
      if (node.type.id === FieldExpression && node.node.getChild(FieldOp)) {
        const newMatchers = matchers[attribute] ?? [];
        newMatchers.push({ operator, value });
        matchers[attribute] = newMatchers;
      }
    },
  });

  return matchers;
}

function unescape(q: string) {
  return q.replaceAll('\\"', '"').replaceAll('\\\\', '\\');
}

function reverseStringMatcher(matches?: Matcher[]) {
  const values: string[] = [];
  for (const { operator, value } of matches ?? []) {
    const unescaped = unescape(value.slice(1, -1));
    if (operator == '=') {
      values.push(unescaped);
    } else if (operator == '=~') {
      values.push(...unescaped.split('|'));
    }
  }
  return values;
}

function reverseIntrinsicMatcher(matches?: Matcher[]) {
  const values: string[] = [];
  for (const { operator, value } of matches ?? []) {
    if (operator == '=') {
      values.push(value);
    }
  }
  return values;
}

function reverseDurationMatcher(matches?: Matcher[]) {
  const duration: DurationField = {};
  for (const { operator, value } of matches ?? []) {
    if (operator == '>=') {
      duration.min = value;
    } else if (operator == '<=') {
      duration.max = value;
    }
  }
  return duration;
}

function reverseCustomMatcher(matchers: Record<string, Matcher[]>, skipAttrs: Set<string>) {
  const customMatchers: string[] = [];
  for (const [attribute, matches] of Object.entries(matchers)) {
    if (skipAttrs.has(attribute)) {
      continue;
    }

    for (const { operator, value } of matches) {
      customMatchers.push(`${attribute}${operator}${value}`);
    }
  }
  return customMatchers;
}
