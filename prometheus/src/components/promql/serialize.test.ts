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

import type ASTNode from './ast';
import { binaryOperatorType, nodeType, vectorMatchCardinality } from './ast';
import serializeNode from './serialize';

const selector = (name: string): ASTNode => ({
  type: nodeType.vectorSelector,
  name,
  matchers: [],
  offset: 0,
  timestamp: null,
  startOrEnd: null,
});

const binaryExpr = (on: boolean, labels: string[], card: vectorMatchCardinality, include: string[]): ASTNode => ({
  type: nodeType.binaryExpr,
  op: binaryOperatorType.mul,
  lhs: selector('foo'),
  rhs: selector('bar'),
  matching: { card, labels, on, include },
  bool: false,
});

describe('serializeNode', () => {
  it('should keep group_left after an empty ignoring()', () => {
    expect(serializeNode(binaryExpr(false, [], vectorMatchCardinality.manyToOne, ['job']))).toEqual(
      'foo * ignoring() group_left(job) bar',
    );
  });

  it('should keep group_right after an empty ignoring()', () => {
    expect(serializeNode(binaryExpr(false, [], vectorMatchCardinality.oneToMany, []))).toEqual(
      'foo * ignoring() group_right() bar',
    );
  });

  it('should not add a matching clause for one-to-one matching without labels', () => {
    expect(serializeNode(binaryExpr(false, [], vectorMatchCardinality.oneToOne, []))).toEqual('foo * bar');
  });

  it('should serialize on() with labels', () => {
    expect(serializeNode(binaryExpr(true, ['instance'], vectorMatchCardinality.manyToOne, ['job']))).toEqual(
      'foo * on(instance) group_left(job) bar',
    );
  });
});
