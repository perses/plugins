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

/* shortened */
const max = Math.max;
const min = Math.min;
const floor = Math.floor;
const ceil = Math.ceil;
const pow = Math.pow;

/**
 * From the mathematical perspective these are the two most common bases which could be used for exponential functions, though any number would be technically valid
 * Both come with advantages and disadvantages. The base should be picked by the users accordingly.
 * For instance, base 2 may be appropriate for the network latency, whereas 10 is much better for db operations
 */
export type ExponentialBase = 2 | 10;

export type TraceHeatMapDurationBuckets = Array<{ start: number; label: string }>;

const baseLog = (base: number, x: number) => Math.log(x) / Math.log(base);

export const getDurationBuckets = (durations: number[], base: ExponentialBase = 2): TraceHeatMapDurationBuckets => {
  const cleanDuration = durations.filter((d) => d > 0);
  const minDuration = min(...cleanDuration);
  const maxDuration = max(...cleanDuration);
  const buckets: TraceHeatMapDurationBuckets = [];

  const startExponent = floor(baseLog(base, minDuration));
  const endExponent = ceil(baseLog(base, maxDuration));

  for (let exp = startExponent; exp <= endExponent; exp++) {
    const start = pow(base, exp);
    const label = start < 1 ? `${start.toFixed(2)} ms` : `${start} ms`;
    buckets.push({ start, label });
  }
  return buckets;
};
