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

import type { MathNode, SymbolNode } from 'mathjs';
import { create, parseDependencies } from 'mathjs';

import type { ExpressionErrorInfo } from '../expression-error';
import { ExpressionError } from '../expression-error';
import { isNodeType } from '../node-guards';

export type { MathNode };

export const MAX_SOURCE_LENGTH = 4096;

/** Maximum AST nesting depth. Bounds recursion in the evaluator so a deeply nested expression cannot overflow the stack. */
export const MAX_DEPTH = 64;

const { parse: mathjsParse } = create({ ...parseDependencies });

// Matches query references: $1, $2, $3, ... (1-based, case-sensitive)
const RE_QUERY_REF = /^\$(\d+)$/;

/**
 * Parses a `$N` symbol name into a 0-based query index, or returns `null` if the name is not a
 * valid query reference.
 */
export function parseQueryRef(name: string): number | null {
  const m = RE_QUERY_REF.exec(name);
  return m ? Number(m[1]) - 1 : null;
}

/**
 * Throws `syntax` if the tree nests deeper than {@link MAX_DEPTH}. Uses an explicit stack rather than
 * recursion so the check itself cannot overflow on a pathological input.
 */
function checkDepth(root: MathNode): void {
  const stack: Array<{ node: MathNode; depth: number }> = [{ node: root, depth: 1 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > MAX_DEPTH) {
      throw new ExpressionError({ code: 'syntax', message: `expression nests deeper than ${MAX_DEPTH} levels` });
    }
    node.forEach((child: MathNode) => stack.push({ node: child, depth: depth + 1 }));
  }
}

export function parseExpression(source: string): MathNode {
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new ExpressionError({
      code: 'syntax',
      message: `expression is too long (max ${MAX_SOURCE_LENGTH} characters)`,
    });
  }
  let node: MathNode;
  try {
    node = mathjsParse(source);
  } catch (err) {
    throw new ExpressionError({ code: 'syntax', message: String(err) });
  }
  checkDepth(node);
  return node;
}

/**
 * Traverses a mathjs MathNode tree and returns a frozen, sorted array of unique 0-based query
 * indexes referenced by `$N` symbols (e.g. $1→0, $2→1).
 */
export function collectReferences(node: MathNode): readonly number[] {
  const refs = new Set<number>();
  node.traverse((n: MathNode) => {
    if (isNodeType<SymbolNode>(n, 'SymbolNode')) {
      const idx = parseQueryRef(n.name);
      if (idx !== null) {
        refs.add(idx);
      }
    }
  });
  return Object.freeze(Array.from(refs).toSorted((a, b) => a - b));
}

export type CacheResult =
  | { ok: true; node: MathNode; references: readonly number[] }
  | { ok: false; error: ExpressionErrorInfo };

export type CachedParser = (source: string) => CacheResult;

/**
 * Wraps the parser in a least-recently-used cache. Failures are cached too, so a bad expression
 * typed in the editor is not re-parsed on every render. Sources longer than {@link MAX_SOURCE_LENGTH}
 * are rejected by {@link parseExpression} and never cached.
 */
export function createParseCache(maxEntries = 128): CachedParser {
  const cache = new Map<string, CacheResult>();

  return function cachedParse(source: string): CacheResult {
    const cacheable = source.length <= MAX_SOURCE_LENGTH;

    if (cacheable) {
      const hit = cache.get(source);
      if (hit !== undefined) {
        cache.delete(source);
        cache.set(source, hit);
        return hit;
      }
    }

    let result: CacheResult;
    try {
      const node = parseExpression(source);
      result = { ok: true, node, references: collectReferences(node) };
    } catch (err) {
      const info = err instanceof ExpressionError ? err.info : ({ code: 'syntax', message: String(err) } as const);
      result = { ok: false, error: Object.freeze(info) };
    }

    if (cacheable) {
      if (cache.size >= maxEntries) {
        const oldest = cache.keys().next();
        if (!oldest.done) {
          cache.delete(oldest.value);
        }
      }
      cache.set(source, result);
    }

    return result;
  };
}
