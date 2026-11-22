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

import type { VariableOption, VariablePlugin } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';

import type { TrinoClient } from '../model/trino-client';
import { formatTrinoDateTime, replaceTimeRangePlaceholders } from '../model/trino-client';
import { DEFAULT_DATASOURCE } from '../queries/constants';
import { interpolateQueryContext, queryVariables } from '../queries/query-context';
import type { TrinoSQLVariableSpec } from './trino-sql-variable-types';
import { TrinoSQLVariableEditor } from './TrinoSQLVariableEditor';

/** MAX_VARIABLE_ROWS is the number of result rows read into variable options; the query is cancelled after it. */
export const MAX_VARIABLE_ROWS = 10000;

function toOptions(columnNames: string[], rows: Array<Record<string, unknown>>): VariableOption[] {
  const [valueColumn, labelColumn] = columnNames;
  if (valueColumn === undefined) return [];

  const options = new Map<string, VariableOption>();
  for (const row of rows.slice(0, MAX_VARIABLE_ROWS)) {
    const raw = row[valueColumn];
    if (raw === null || raw === undefined) continue;
    const value = String(raw);
    if (options.has(value)) continue;
    const rawLabel = labelColumn === undefined ? undefined : row[labelColumn];
    options.set(value, { value, label: rawLabel === null || rawLabel === undefined ? value : String(rawLabel) });
  }
  return Array.from(options.values());
}

/** TrinoSQLVariable is the list variable plugin that fills its options from a Trino SQL result. */
export const TrinoSQLVariable: VariablePlugin<TrinoSQLVariableSpec> = {
  getVariableOptions: async (spec, ctx, abortSignal) => {
    if (!spec.query?.trim()) return { data: [] };

    const client = (await ctx.datasourceStore.getDatasourceClient(
      spec.datasource ?? DEFAULT_DATASOURCE,
    )) as TrinoClient;
    const start = formatTrinoDateTime(ctx.timeRange.start);
    const end = formatTrinoDateTime(ctx.timeRange.end);
    const query = replaceTimeRangePlaceholders(replaceVariables(spec.query, ctx.variables), start, end);

    const response = await client.query({
      maxRows: MAX_VARIABLE_ROWS,
      start,
      end,
      query,
      ...interpolateQueryContext(spec, ctx.variables),
      signal: abortSignal,
    });

    const rows = response.data ?? [];
    const columnNames = response.columns?.map((column) => column.name) ?? Object.keys(rows[0] ?? {});
    return { data: toOptions(columnNames, rows) };
  },
  dependsOn: (spec) => ({ variables: queryVariables(spec) }),
  OptionsEditorComponent: TrinoSQLVariableEditor,
  createInitialOptions: () => ({ query: '' }),
};
