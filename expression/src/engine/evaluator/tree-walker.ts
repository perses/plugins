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
import type {
  ConstantNode,
  FunctionNode,
  MathNode,
  OperatorNode,
  OperatorNodeMap,
  OperatorNodeOp,
  ParenthesisNode,
  SymbolNode,
} from 'mathjs';

import { ExpressionError } from '../expression-error';
import { isNodeType } from '../node-guards';
import { parseQueryRef } from '../parser';
import type { BudgetedOperations } from './operations';
import type { BinaryOp, UnaryOp } from './operators';
import { BINARY_OPS, UNARY_OPS } from './operators';
import type { Value } from './values';

const SUPPORTED_BINARY_OPS = new Set<string>(BINARY_OPS);
const SUPPORTED_UNARY_OPS = new Set<string>(UNARY_OPS);

export class TreeWalker {
  private readonly operations: BudgetedOperations;
  private readonly sharedGrid: number[];
  private readonly inputs: Map<number, TimeSeriesData>;
  private readonly alignedCache: Map<number, Value>;
  private readonly signal?: AbortSignal;

  constructor({
    sharedGrid,
    inputs,
    signal,
    operations,
  }: {
    operations: BudgetedOperations;
    sharedGrid: number[];
    inputs: Map<number, TimeSeriesData>;
    signal?: AbortSignal;
  }) {
    this.operations = operations;
    this.sharedGrid = sharedGrid;
    this.inputs = inputs;
    this.alignedCache = new Map();
    this.signal = signal;
  }

  walk(node: MathNode): Value {
    this.checkAbort();

    if (isNodeType<ConstantNode>(node, 'ConstantNode')) {
      return this.walkConstant(node);
    }
    if (isNodeType<SymbolNode>(node, 'SymbolNode')) {
      return this.walkSymbol(node);
    }
    if (isNodeType<OperatorNode>(node, 'OperatorNode')) {
      return this.walkOperator(node);
    }
    if (isNodeType<FunctionNode>(node, 'FunctionNode')) {
      return this.walkFunction(node);
    }
    if (isNodeType<ParenthesisNode>(node, 'ParenthesisNode')) {
      return this.walk(node.content);
    }

    throw new ExpressionError({ code: 'syntax', message: `unsupported expression node type: ${node.type}` });
  }

  private walkConstant(node: ConstantNode): Value {
    return { kind: 'scalar', value: Number(node.value) };
  }

  private walkSymbol(node: SymbolNode): Value {
    const { name } = node;
    const idx = parseQueryRef(name);
    if (idx === null) {
      throw new ExpressionError({
        code: 'unknown_reference',
        message: `unknown symbol: ${name}. Query references use the form $1, $2, ...`,
      });
    }
    return this.operations.alignQueryInput(idx, this.inputs, this.sharedGrid, this.alignedCache, this.signal);
  }

  private walkOperator(node: OperatorNode<OperatorNodeOp, keyof OperatorNodeMap, MathNode[]>): Value {
    const { op, args } = node;

    if (args.length === 1 && args[0] !== undefined) {
      if (!SUPPORTED_UNARY_OPS.has(op)) {
        throw new ExpressionError({ code: 'syntax', message: `unsupported unary operator: ${op}` });
      }
      return this.operations.applyUnary(op as UnaryOp, this.walk(args[0]));
    }

    if (args.length === 2 && args[0] !== undefined && args[1] !== undefined) {
      if (!SUPPORTED_BINARY_OPS.has(op)) {
        throw new ExpressionError({ code: 'syntax', message: `unsupported operator: ${op}` });
      }
      const left = this.walk(args[0]);
      const right = this.walk(args[1]);
      return this.operations.applyBinary(op as BinaryOp, left, right);
    }

    throw new ExpressionError({ code: 'syntax', message: `unexpected operator arity: ${args.length}` });
  }

  private walkFunction(node: FunctionNode): Value {
    const evaluatedArgs = node.args.map((a) => {
      return this.walk(a);
    });
    return this.operations.applyFunction(node.fn.name, evaluatedArgs);
  }

  private checkAbort(): void {
    if (this.signal?.aborted) {
      throw new ExpressionError({ code: 'aborted', message: 'evaluation was aborted' });
    }
  }
}
