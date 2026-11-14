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

import type { SortOption, VariableStateMap } from '@perses-dev/components';
import { replaceVariablesInUrl } from '@perses-dev/components';

import type { ColorOverride } from './bar-chart-model';
import { DEFAULT_SORT } from './bar-chart-model';
import type { BarChartData } from './BarChartBase';

const fieldLabelPattern = /\$\{__field\.labels\.([A-Za-z_][A-Za-z0-9_]*)\}/g;
const fieldParamPattern = /[?&]([^=&]+)=\$\{__field\.labels\.[^}]+\}/g;
const allSentinel = '$__all';

export function fieldLinkParams(template: string): string[] {
  return [...template.matchAll(fieldParamPattern)].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));
}

function isAllValue(value: VariableStateMap[string]['value'] | undefined): boolean {
  return value === allSentinel || (Array.isArray(value) && value.length === 1 && value[0] === allSentinel);
}

// barLinkHref fills dashboard variables, then ${__field.labels.<name>} from the series.
// All stays $__all so the next dashboard still selects its All option.
export function barLinkHref(
  template: string,
  labels: Record<string, string>,
  variables: VariableStateMap,
  renderVariables = true,
): string {
  let source = template;
  if (renderVariables) {
    const names = Object.keys(variables).toSorted((a, b) => b.length - a.length);
    for (const name of names) {
      if (!isAllValue(variables[name]?.value)) {
        continue;
      }
      source = source.replace(new RegExp(String.raw`\$${name}\b|\$\{${name}(?::[^}]+)?\}`, 'g'), allSentinel);
    }
  }
  const withVars = renderVariables ? replaceVariablesInUrl(source, variables) : source;
  return withVars.replace(fieldLabelPattern, (_match, name: string) => encodeURIComponent(labels[name] ?? ''));
}

// withLiveDashboardVars prefers the address bar. Interpolation turns All into .*
// and a one-element list into (Value). keepKeys are the field-label params.
export function withLiveDashboardVars(url: string, search: string, keepKeys: readonly string[] = []): string {
  const current = new URLSearchParams(search);
  const base = new URL(url, 'http://perses.local');
  for (const key of new Set(base.searchParams.keys())) {
    if (!key.startsWith('var-') || keepKeys.includes(key)) {
      continue;
    }
    const live = current.get(key);
    if (live !== null) {
      base.searchParams.set(key, live);
      continue;
    }
    if (base.searchParams.get(key) === '.*') {
      base.searchParams.set(key, allSentinel);
    }
  }
  return `${base.pathname}${base.search}`.replace(/%24/g, '$');
}

// withLocationTime keeps the current dashboard range on an in-app link.
export function withLocationTime(url: string, search: string): string {
  const current = new URLSearchParams(search);
  const base = new URL(url, 'http://perses.local');
  for (const key of ['start', 'end', 'tz']) {
    const value = current.get(key);
    if (value && !base.searchParams.has(key)) {
      base.searchParams.set(key, value);
    }
  }
  return `${base.pathname}${base.search}`.replace(/%24/g, '$');
}

export function calculatePercentages(data: BarChartData[]): BarChartData[] {
  const sum = data.reduce((accumulator, { value }) => accumulator + (value ?? 0), 0);
  return data.map((seriesData) => {
    const percentage = ((seriesData.value ?? 0) / sum) * 100;
    return {
      ...seriesData,
      value: percentage,
    };
  });
}

export function sortSeriesData(data: BarChartData[], sortOrder: SortOption = DEFAULT_SORT): BarChartData[] {
  if (sortOrder === 'asc') {
    // sort in ascending order by value
    return data.toSorted((a, b) => {
      if (a.value === null) {
        return 1;
      }
      if (b.value === null) {
        return -1;
      }
      if (a.value === b.value) {
        return 0;
      }
      return a.value < b.value ? 1 : -1;
    });
  } else {
    // sort in descending order by value
    return data.toSorted((a, b) => {
      if (a.value === null) {
        return -1;
      }
      if (b.value === null) {
        return 1;
      }
      if (a.value === b.value) {
        return 0;
      }
      return a.value < b.value ? -1 : 1;
    });
  }
}

/**
 * Returns the color of the first override whose regex matches the given name.
 * Invalid regex patterns are skipped. Returns undefined if no override matches.
 */
export function getOverrideColor(name: string, overrides?: ColorOverride[]): string | undefined {
  if (!overrides) return undefined;
  for (const override of overrides) {
    if (override.regex === '') {
      continue;
    }
    try {
      if (new RegExp(override.regex).test(name)) {
        return override.color;
      }
    } catch {
      // ignore invalid regex patterns
    }
  }
  return undefined;
}
