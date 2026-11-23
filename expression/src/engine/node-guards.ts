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

import type { MathNode } from 'mathjs';

/**
 * Narrows a {@link MathNode} to one of its subtypes by the `type` tag.
 *
 * mathjs 15 types `MathNode` as a base interface rather than a discriminated union, so narrowing on
 * `node.type` alone does not refine it. This guard narrows without a cast and adds nothing to the
 * bundle (unlike importing mathjs's own `isXNode` guards as runtime values, which would pull the
 * full library and defeat the tree-shaking `create({...})` setup).
 */
export function isNodeType<T extends MathNode>(node: MathNode, type: T['type']): node is T {
  return node.type === type;
}
