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

import type { ErrorCode } from '../expression-error';
import { ExpressionError } from '../expression-error';
import type { Limits } from '../types';

export type { Limits };

export const DEFAULT_LIMITS: Readonly<Limits> = Object.freeze({
  maxSeries: 1000,
  maxPointsPerSeries: 11000,
  maxSamples: 5_000_000,
});

export class SampleBudget {
  private total = 0;
  private readonly limits: Limits;

  constructor(limits: Limits) {
    this.limits = limits;
  }

  get maxPointsPerSeries(): number {
    return this.limits.maxPointsPerSeries;
  }

  /** Throws `limit_exceeded` if `count` exceeds `maxSeries`. */
  checkSeriesLimit(count: number): void {
    if (count > this.limits.maxSeries) {
      this.overLimit('limit_exceeded', `inputs have more than ${this.limits.maxSeries} series in total`);
    }
  }

  /** Adds `count` to the running sample total and throws `limit_exceeded` if `maxSamples` is breached. */
  charge(count: number): void {
    this.total += count;
    if (this.total > this.limits.maxSamples) {
      this.overLimit('limit_exceeded', `exceeded maxSamples (${this.limits.maxSamples})`);
    }
  }

  /** Unconditionally throws an {@link ExpressionError} with the given code and message. Typed as `never` so callers can use it as a return expression. */
  overLimit(code: ErrorCode, message: string): never {
    throw new ExpressionError({ code, message });
  }
}
