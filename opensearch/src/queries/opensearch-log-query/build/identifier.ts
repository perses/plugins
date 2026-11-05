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

/**
 * Escape a user-supplied identifier (such as the timestamp field name) for safe
 * interpolation inside a backtick-quoted PPL or SQL identifier. A backtick in the value
 * would otherwise close the quoting early and let the rest of the string be parsed as
 * query text, producing an invalid — or potentially injected — query. Both languages
 * escape a literal backtick by doubling it.
 */
export function escapeIdentifier(name: string): string {
  return name.replace(/`/g, '``');
}
