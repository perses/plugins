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

import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import { findColumn } from '../../model/click-house-types';
import { executeQuery } from '../../model/execute-query';
import { toText } from '../../model/values';
import type { ClickHouseSQLVariableSpec } from './click-house-sql-variable-types';

/**
 * buildVariableOptions converts a result into the options of a variable. The value of an option is the `value`
 * column of a row, or else its first column, and its label is the `label` column, or else the value. Rows without a
 * value are left out, and so are the ones repeating a value.
 */
export function buildVariableOptions(response: ClickHouseQueryResponse): VariableOption[] {
  const { columns, rows } = response;
  if (columns.length === 0) return [];
  const named = findColumn(columns, ['value', '__value']);
  const value = named === -1 ? 0 : named;
  const label = findColumn(columns, ['label', '__text']);
  const options = new Map<string, VariableOption>();
  for (const row of rows) {
    const optionValue = toText(row[value]);
    if (optionValue === '' || options.has(optionValue)) continue;
    const optionLabel = label === -1 ? '' : toText(row[label]);
    options.set(optionValue, { value: optionValue, label: optionLabel || optionValue });
  }
  return [...options.values()];
}

export const getVariableOptions: VariablePlugin<ClickHouseSQLVariableSpec>['getVariableOptions'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (!spec.query?.trim()) {
    return { data: [] };
  }
  const result = await executeQuery(
    spec,
    { datasourceStore: context.datasourceStore, variableState: context.variables, timeRange: context.timeRange },
    abortSignal,
  );
  return { data: buildVariableOptions(result) };
};
