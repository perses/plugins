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

import type { VariableStateMap } from '@perses-dev/components';
import { interpolate, InterpolationFormat, parseFormat, replaceVariables } from '@perses-dev/components';
import type { Labels } from '@perses-dev/spec';

import type { PrometheusExemplarLinkSpec } from '../types';

/**
 * Name of the placeholder replaced with the trace ID of the exemplar in a link URL.
 * Same name as the one supported by the links of the TraceTable panel.
 */
export const TRACE_ID_VARIABLE = 'traceId';

// Matches ${traceId}, ${traceId:format} and $traceId.
const TRACE_ID_REGEX = /\$\{traceId(?::([a-zA-Z]+))?\}|\$traceId\b/g;

/**
 * A link attached to an exemplar. Mirrors `ExemplarLink` of @perses-dev/spec, which is only
 * available from v0.4.0: import it from there once this package depends on that version.
 */
export interface ExemplarLink {
  name?: string;
  url: string;
}

/**
 * A link of the datasource whose URL only has the trace ID left to resolve.
 */
export interface ExemplarLinkTemplate {
  name?: string;
  url: string;
  traceIDLabel: string;
}

/**
 * Resolves the dashboard variables of the links configured on the datasource. This is the same
 * for every exemplar of a query, so it is done once instead of once per exemplar.
 */
export function prepareExemplarLinks(
  links: PrometheusExemplarLinkSpec[] | undefined,
  variableState: VariableStateMap,
): ExemplarLinkTemplate[] {
  if (!links?.length) return [];

  // The trace ID placeholder always refers to the exemplar, even when the dashboard
  // has a variable with the same name.
  const { [TRACE_ID_VARIABLE]: _shadowed, ...variables } = variableState;

  return links
    .filter((link) => link.url !== '' && link.traceIDLabel !== '')
    .map((link) => ({
      name: link.name ? replaceVariables(link.name, variables) : undefined,
      url: replaceVariables(link.url, variables),
      traceIDLabel: link.traceIDLabel,
    }));
}

/**
 * Builds the links of an exemplar from the links configured on the datasource.
 * A link is only produced when the exemplar has the label holding the trace ID.
 * Returns undefined when there is no link, so the exemplar payload is left unchanged.
 */
export function buildExemplarLinks(templates: ExemplarLinkTemplate[], labels: Labels): ExemplarLink[] | undefined {
  const links: ExemplarLink[] = [];
  for (const template of templates) {
    const traceId = labels[template.traceIDLabel];
    if (!traceId) continue;

    const url = template.url.replace(TRACE_ID_REGEX, (_match, format: string | undefined) =>
      // The trace ID comes from the scraped data: it is URL encoded by default so it cannot alter
      // the structure of the URL, like the cell values embedded in the links of the Table panel.
      interpolate([traceId], TRACE_ID_VARIABLE, parseFormat(format) ?? InterpolationFormat.PERCENTENCODE),
    );
    links.push(template.name ? { name: template.name, url } : { url });
  }
  return links.length > 0 ? links : undefined;
}
