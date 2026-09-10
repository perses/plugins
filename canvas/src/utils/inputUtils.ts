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

export interface ParseNumberOpts {
  min?: number;
  optional?: boolean;
}

export function parseNumberInput(
  rawValue: string,
  currentValue: number | undefined,
  opts: ParseNumberOpts = {},
): number | undefined {
  const v = parseFloat(rawValue);
  if (Number.isFinite(v) && (opts.min === undefined || v >= opts.min)) return v;
  if (opts.optional && rawValue === '') return undefined;
  return currentValue;
}
