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

export type OperatorType = '=' | '!=' | '=~' | '!~';

export interface LabelFilter {
  labelName: string;
  labelValue: string;
  operator: OperatorType;
}

export function computeFilterExpr(filters: LabelFilter[]): string {
  return `${filters
    .filter((filter) => filter.labelName !== '' && filter.labelValue !== '')
    .map((filter) => `${filter.labelName}${filter.operator}"${filter.labelValue}"`)
    .join(',')}`;
}

/**
 * Builds the selector used to scope label name/value lookups, e.g. `{service_name="app",__profile_type__="..."}`.
 * Returns an empty string when no service is set: Pyroscope only narrows the blocks it reads on `service_name`,
 * so an unscoped lookup scans every block in the time range and can exceed the query-backend concurrency limit.
 */
export function computeLabelScopeSelector(service?: string, profileType?: string): string {
  if (!service) {
    return '';
  }
  const selectors = [`service_name="${service}"`];
  if (profileType) {
    selectors.push(`__profile_type__="${profileType}"`);
  }
  return `{${selectors.join(',')}}`;
}
