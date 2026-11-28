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

import { ExpressionError } from '../expression-error';
import type { AlignRequest } from './align';
import { alignInput } from './align';
import { applyFunction as _applyFunction } from './functions';
import type { SampleBudget } from './limits';
import type { BinaryOp, UnaryOp } from './operators';
import { applyBinary as _applyBinary, applyUnary as _applyUnary } from './operators';
import type { Value } from './values';

export class BudgetedOperations {
  private readonly budget: SampleBudget;

  constructor(budget: SampleBudget) {
    this.budget = budget;
  }

  applyUnary(op: UnaryOp, val: Value): Value {
    return this.charged(_applyUnary(op, val));
  }

  applyBinary(op: BinaryOp, left: Value, right: Value): Value {
    return this.charged(_applyBinary(op, left, right));
  }

  applyFunction(name: string, args: Value[]): Value {
    return this.charged(_applyFunction(name, args));
  }

  alignQueryInput(
    index: number,
    inputs: Map<number, TimeSeriesData>,
    sharedGrid: number[],
    alignedCache: Map<number, Value>,
    signal?: AbortSignal,
  ): Value {
    const cached = alignedCache.get(index);
    if (cached) {
      return cached;
    }

    const input = inputs.get(index);
    if (!input) {
      throw new ExpressionError({ code: 'unknown_reference', message: `query $${index + 1} is not available` });
    }

    const req: AlignRequest = { grid: sharedGrid, input, signal };
    const aligned = alignInput(req);
    const value: Value = { kind: 'series', grid: sharedGrid, series: aligned.series };
    alignedCache.set(index, value);
    return this.charged(value);
  }

  private charged(value: Value): Value {
    if (value.kind === 'series') {
      this.budget.charge(value.series.length * value.grid.length);
    }
    return value;
  }
}
