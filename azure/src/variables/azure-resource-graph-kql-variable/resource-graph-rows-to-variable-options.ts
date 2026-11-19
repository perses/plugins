// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { VariableOption } from '@perses-dev/plugin-system';

import { DEFAULT_VALUE_COLUMN_NAME } from './constants';

// Converts rows from the Azure Resource Graph into key-value pairs
export function resourceGraphRowsToVariableOptions(
  data: unknown,
  labelColumnName?: string,
  valueColumnName: string = DEFAULT_VALUE_COLUMN_NAME,
): VariableOption[] {
  if (!Array.isArray(data)) {
    return [];
  }

  if (!labelColumnName) {
    labelColumnName = valueColumnName;
  }

  return data.reduce<VariableOption[]>((acc, row) => {
    if (row === null || typeof row !== 'object') {
      return acc;
    }
    const label = String((row as Record<string, unknown>)[labelColumnName] ?? '');
    const value = String((row as Record<string, unknown>)[valueColumnName] ?? '');
    if (label && value) {
      acc.push({ label, value });
    }
    return acc;
  }, []);
}
