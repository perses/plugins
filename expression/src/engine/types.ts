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

import type { TimeSeriesData } from '@perses-dev/spec';

export interface Limits {
  maxSeries: number;
  maxPointsPerSeries: number;
  maxSamples: number;
}

export interface EvaluationRequest {
  expression: string;
  inputs: Record<number, TimeSeriesData>;
  startMs: number;
  endMs: number;
  /**
   * Suggested step (ms) used only to grid a pure-scalar expression (no query references) across the
   * request range. Expressions referencing queries derive their grid from the input timestamps.
   */
  stepMs?: number;
}
