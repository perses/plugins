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

export type Sample = number | null;

/**
 * A frozen, sorted record of label key-value pairs.
 */
export type Labels = Readonly<Record<string, string>>;

export interface Scalar {
  kind: 'scalar';
  value: Sample;
}

export interface Series {
  name: string;
  labels: Labels;
  /** Pre-computed JSON key for label matching; equals labelsKey(labels). */
  key: string;
  values: Sample[];
}

export interface SeriesSet {
  kind: 'series';
  /** Millisecond timestamps for each sample position */
  grid: number[];
  series: Series[];
}

export type Value = Scalar | SeriesSet;

export function labelsKey(labels: Record<string, string>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(labels).toSorted(([a], [b]) => a.localeCompare(b))));
}

/**
 * Filters (optionally dropping keys), sorts, freezes, and returns the labels
 * alongside their pre-computed key. Use this when creating a new Series so
 * the key is computed exactly once.
 */
export function freezeLabels(
  labels: Record<string, string>,
  drop?: ReadonlySet<string>,
): { labels: Labels; key: string } {
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(labels)) {
    if (!drop?.has(k)) {
      filtered[k] = v;
    }
  }
  const key = labelsKey(filtered);
  return { labels: Object.freeze(filtered), key };
}
