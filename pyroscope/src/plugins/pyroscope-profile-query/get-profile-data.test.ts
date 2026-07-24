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

import { ProfileData, StackTrace } from '@perses-dev/spec';
import { SearchProfilesResponse } from '../../model';
import { transformProfileResponse } from './get-profile-data';

// Flamebearer levels use groups of 4 numbers: [offset, total, self, nameIndex].
// `offset` is the gap (in samples) since the end of the previous sibling on the same level.
//
//            root [0,10)
//           /            \
//      foo [0,6)        bar [6,10)
//      /       \                \
// baz [0,3) qux [3,5)        quux [6,10)
const MOCK_RESPONSE: SearchProfilesResponse = {
  flamebearer: {
    names: ['root', 'foo', 'bar', 'baz', 'qux', 'quux'],
    levels: [
      [0, 10, 2, 0],
      [0, 6, 1, 1, 0, 4, 4, 2],
      [0, 3, 3, 3, 0, 2, 2, 4, 1, 4, 4, 5],
    ],
    numTicks: 42,
    maxSelf: 4,
  },
  metadata: {
    format: 'single',
    spyName: 'gospy',
    sampleRate: 100,
    units: 'samples',
    name: 'process_cpu',
  },
  timeline: {
    startTime: 1_600_000_000,
    samples: [1, 2, 3],
    durationDelta: 10,
  },
};

// A deeper, wider tree with gaps between siblings (self time) and a function ("recurse")
// that appears at three different call sites sharing the same nameIndex - simulating recursion.
//
//                     root [0,20)
//                 /                  \
//          main [0,18)            cleanup [18,20)
//          /            \
//   recurse [2,10)    recurse [12,18)
//    /         \
// recurse [2,6) helper [7,9)
const MOCK_COMPLEX_RESPONSE: SearchProfilesResponse = {
  flamebearer: {
    names: ['root', 'main', 'cleanup', 'recurse', 'helper'],
    levels: [
      [0, 20, 0, 0],
      [0, 18, 4, 1, 0, 2, 2, 2],
      [2, 8, 2, 3, 2, 6, 6, 3],
      [2, 4, 4, 3, 1, 2, 2, 4],
    ],
    numTicks: 20,
    maxSelf: 6,
  },
  metadata: {
    format: 'single',
    spyName: 'gospy',
    sampleRate: 100,
    units: 'samples',
    name: 'process_cpu',
  },
  timeline: {
    startTime: 1_600_000_000,
    samples: [1, 2, 3],
    durationDelta: 10,
  },
};

describe('transformProfileResponse', () => {
  it('returns empty profile data when there is no response', () => {
    expect(transformProfileResponse(undefined as unknown as SearchProfilesResponse)).toEqual({
      profile: { stackTrace: { id: 0, name: '', level: 0, start: 0, end: 0, total: 0, self: 0, children: [] } },
      numTicks: 0,
      maxSelf: 0,
      metadata: { spyName: '', sampleRate: 0, units: '', name: '' },
      timeline: { startTime: 0, samples: [], durationDelta: 0 },
    });
  });

  it('builds the stack trace tree from the flamebearer levels', () => {
    const result = transformProfileResponse(MOCK_RESPONSE);

    const baz: StackTrace = { id: 4, name: 'baz', level: 2, start: 0, end: 3, total: 3, self: 3, children: [] };
    const qux: StackTrace = { id: 5, name: 'qux', level: 2, start: 3, end: 5, total: 2, self: 2, children: [] };
    const quux: StackTrace = { id: 6, name: 'quux', level: 2, start: 6, end: 10, total: 4, self: 4, children: [] };
    const foo: StackTrace = {
      id: 2,
      name: 'foo',
      level: 1,
      start: 0,
      end: 6,
      total: 6,
      self: 1,
      children: [baz, qux],
    };
    const bar: StackTrace = { id: 3, name: 'bar', level: 1, start: 6, end: 10, total: 4, self: 4, children: [quux] };
    const root: StackTrace = {
      id: 1,
      name: 'root',
      level: 0,
      start: 0,
      end: 10,
      total: 10,
      self: 2,
      children: [foo, bar],
    };

    expect(result.profile.stackTrace).toEqual(root);
  });

  it('passes through numTicks, maxSelf, metadata and timeline unchanged', () => {
    const result = transformProfileResponse(MOCK_RESPONSE);

    expect(result.numTicks).toBe(42);
    expect(result.maxSelf).toBe(4);
    expect(result.metadata).toEqual({
      spyName: 'gospy',
      sampleRate: 100,
      units: 'samples',
      name: 'process_cpu',
    });
    expect(result.timeline).toEqual({
      startTime: 1_600_000_000,
      samples: [1, 2, 3],
      durationDelta: 10,
    });
  });

  it('returns an empty stack trace when there are no levels', () => {
    const response: SearchProfilesResponse = {
      ...MOCK_RESPONSE,
      flamebearer: { ...MOCK_RESPONSE.flamebearer, levels: [] },
    };

    const result = transformProfileResponse(response);

    expect(result.profile.stackTrace).toEqual({
      id: 0,
      name: '',
      level: 0,
      start: 0,
      end: 0,
      total: 0,
      self: 0,
      children: [],
    });
  });

  it('builds a deeper tree with multiple siblings, gaps between children, and a name reused across call sites', () => {
    const result = transformProfileResponse(MOCK_COMPLEX_RESPONSE);

    const recurseLeaf: StackTrace = {
      id: 6,
      name: 'recurse',
      level: 3,
      start: 2,
      end: 6,
      total: 4,
      self: 4,
      children: [],
    };
    const helper: StackTrace = { id: 7, name: 'helper', level: 3, start: 7, end: 9, total: 2, self: 2, children: [] };
    const recurse1: StackTrace = {
      id: 4,
      name: 'recurse',
      level: 2,
      start: 2,
      end: 10,
      total: 8,
      self: 2,
      children: [recurseLeaf, helper],
    };
    const recurse2: StackTrace = {
      id: 5,
      name: 'recurse',
      level: 2,
      start: 12,
      end: 18,
      total: 6,
      self: 6,
      children: [],
    };
    const main: StackTrace = {
      id: 2,
      name: 'main',
      level: 1,
      start: 0,
      end: 18,
      total: 18,
      self: 4,
      children: [recurse1, recurse2],
    };
    const cleanup: StackTrace = {
      id: 3,
      name: 'cleanup',
      level: 1,
      start: 18,
      end: 20,
      total: 2,
      self: 2,
      children: [],
    };
    const root: StackTrace = {
      id: 1,
      name: 'root',
      level: 0,
      start: 0,
      end: 20,
      total: 20,
      self: 0,
      children: [main, cleanup],
    };

    expect(result.profile.stackTrace).toEqual(root);
  });
});

// copy of transformProfileResponse as it existed before the O(n) rewrite
function legacyTransformProfileResponse(response: SearchProfilesResponse): ProfileData {
  const newResponse: ProfileData = {
    profile: { stackTrace: {} as StackTrace },
    numTicks: 0,
    maxSelf: 0,
    metadata: { spyName: '', sampleRate: 0, units: '', name: '' },
    timeline: { startTime: 0, samples: [], durationDelta: 0 },
  };

  if (!response) {
    return newResponse;
  }

  const stackTraces: StackTrace[][] = [];
  let id = 1;

  for (let i = 0; i < response.flamebearer.levels.length; i++) {
    let current = 0;
    const row: StackTrace[] = [];
    const level = response.flamebearer.levels[i];
    if (!level) {
      continue;
    }

    for (let j = 0; j < level.length; j += 4) {
      const temp: StackTrace = {} as StackTrace;
      temp.id = id;
      id += 1;
      const indexInNamesArray = level[j + 3];
      if (indexInNamesArray !== undefined) {
        const name = response.flamebearer.names[indexInNamesArray];
        if (name) {
          temp.name = name;
        }
      }
      temp.level = i;

      const total = level[j + 1];
      if (total !== undefined) {
        temp.total = total;
      }

      const self = level[j + 2];
      if (self !== undefined) {
        temp.self = self;
      }

      const offset = level[j];
      if (offset !== undefined) {
        current += offset;
      }
      temp.start = current;
      if (total !== undefined) {
        current += total;
      }
      temp.end = current;
      temp.children = [];

      row.push(temp);
    }

    stackTraces.push(row);
  }

  legacyAddChildren(stackTraces);
  if (stackTraces[0]?.[0]) {
    newResponse.profile.stackTrace = stackTraces[0][0];
  }

  newResponse.numTicks = response.flamebearer.numTicks;
  newResponse.maxSelf = response.flamebearer.maxSelf;
  newResponse.metadata = {
    spyName: response.metadata.spyName,
    sampleRate: response.metadata.sampleRate,
    units: response.metadata.units,
    name: response.metadata.name,
  };
  newResponse.timeline = {
    startTime: response.timeline.startTime,
    samples: response.timeline.samples,
    durationDelta: response.timeline.durationDelta,
  };

  return newResponse;
}

function legacyAddChildren(stackTraces: StackTrace[][]): void {
  for (let i = 1; i < stackTraces.length; i++) {
    const currentLevel = stackTraces[i];
    const parentLevel = stackTraces[i - 1];
    if (!currentLevel || !parentLevel) {
      continue;
    }

    for (let j = 0; j < currentLevel.length; j++) {
      const currentStack = currentLevel[j];
      if (!currentStack) {
        continue;
      }

      for (let k = 0; k < parentLevel.length; k++) {
        const parentStack = parentLevel[k];
        if (!parentStack) {
          continue;
        }

        if (currentStack.start >= parentStack.start && currentStack.end <= parentStack.end) {
          parentStack.children.push(currentStack);
          break;
        }
      }
    }
  }
}

function createRng(seed: number): () => number {
  let state = seed;
  return (): number => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

interface GeneratedNode {
  start: number;
  end: number;
  self: number;
  name: string;
  children: GeneratedNode[];
}

// Recursively builds a random-but-valid flame graph: each node's children are non-overlapping,
// ordered, and contained within their parent's [start, end) range, with random gaps between them
// representing time spent in the parent itself (self time). `namePool` accumulates every name
// generated for this tree, and is sometimes reused instead of minting a new one - simulating a
// function that appears at multiple call sites (recursion, or a shared helper) and therefore
// shares a single nameIndex across otherwise-unrelated StackTrace nodes, the way real profiles do.
function buildRandomTree(
  rng: () => number,
  start: number,
  end: number,
  depth: number,
  maxDepth: number,
  namePool: string[]
): GeneratedNode {
  const reuseName = namePool.length > 0 && rng() < 0.4;
  const name = reuseName ? namePool[Math.floor(rng() * namePool.length)]! : `fn-${depth}-${start}-${end}`;
  if (!reuseName) {
    namePool.push(name);
  }
  const total = end - start;

  if (depth >= maxDepth || total <= 1) {
    return { start, end, self: total, name, children: [] };
  }

  const children: GeneratedNode[] = [];
  let cursor = start;
  const childCount = Math.floor(rng() * 6); // 0..5 children

  for (let c = 0; c < childCount; c++) {
    const remaining = end - cursor;
    if (remaining <= 1) {
      break;
    }
    cursor += Math.floor(rng() * Math.min(3, remaining)); // gap before this child (parent's self time)

    const remainingAfterGap = end - cursor;
    if (remainingAfterGap <= 1) {
      break;
    }
    const childLength = 1 + Math.floor(rng() * (remainingAfterGap - 1));
    children.push(buildRandomTree(rng, cursor, cursor + childLength, depth + 1, maxDepth, namePool));
    cursor += childLength;
  }

  return { start, end, self: end - cursor, name, children };
}

// Flattens the generated tree into the same flat, per-level [offset, total, self, nameIndex] encoding
// used by the real Pyroscope API (offset is cumulative across the whole level, not per-parent).
function toSearchProfilesResponse(root: GeneratedNode): SearchProfilesResponse {
  const names: string[] = [];
  const levels: number[][] = [];

  let currentLevel: GeneratedNode[] = [root];
  while (currentLevel.length > 0) {
    const rawLevel: number[] = [];
    const nextLevel: GeneratedNode[] = [];
    let cursor = 0;

    for (const node of currentLevel) {
      let nameIndex = names.indexOf(node.name);
      if (nameIndex === -1) {
        nameIndex = names.length;
        names.push(node.name);
      }
      rawLevel.push(node.start - cursor, node.end - node.start, node.self, nameIndex);
      cursor = node.end;
      nextLevel.push(...node.children);
    }

    levels.push(rawLevel);
    currentLevel = nextLevel;
  }

  return {
    flamebearer: { names, levels, numTicks: root.end - root.start, maxSelf: root.self },
    metadata: { format: 'single', spyName: 'gospy', sampleRate: 100, units: 'samples', name: 'process_cpu' },
    timeline: { startTime: 0, samples: [], durationDelta: 0 },
  };
}

describe('transformProfileResponse (regression against the pre-optimization implementation)', () => {
  // this test cases is the only one that create divergent output
  // the legacy fallback for a missing response returned a {}
  // but new rewrite of transformProfileResponse returns a fully populated stackTrace
  it('changes the empty-response fallback from an incomplete object to a valid empty StackTrace', () => {
    const legacy = legacyTransformProfileResponse(undefined as unknown as SearchProfilesResponse);
    const current = transformProfileResponse(undefined as unknown as SearchProfilesResponse);

    expect(legacy.profile.stackTrace).toEqual({});
    expect(current.profile.stackTrace).toEqual({
      id: 0,
      name: '',
      level: 0,
      start: 0,
      end: 0,
      total: 0,
      self: 0,
      children: [],
    });
  });

  it('produces identical output to the legacy implementation for many randomly generated profiles', () => {
    // Several independent seeds rather than one, so coverage isn't at the mercy of a single PRNG
    // stream happening (or failing) to hit a given structural edge case.
    const seeds = [42, 7, 1337, 99991, 2024];

    for (const seed of seeds) {
      const rng = createRng(seed);

      for (let i = 0; i < 200; i++) {
        const totalSamples = 20 + Math.floor(rng() * 500);
        const maxDepth = 2 + Math.floor(rng() * 6);
        const response = toSearchProfilesResponse(buildRandomTree(rng, 0, totalSamples, 0, maxDepth, []));

        expect(transformProfileResponse(response)).toEqual(legacyTransformProfileResponse(response));
      }
    }
  });

  it('produces identical output to the legacy implementation for a wide flat level (many siblings, no children)', () => {
    const names = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'];
    // 10 siblings at the same level, back-to-back with no gaps, each a leaf - stresses the O(n)
    // parentIndex cursor advancing across many same-level nodes under a single parent.
    const levels: number[][] = [
      [0, 100, 0, 0],
      [
        0, 10, 10, 1, 0, 10, 10, 2, 0, 10, 10, 3, 0, 10, 10, 4, 0, 10, 10, 5, 0, 10, 10, 6, 0, 10, 10, 7, 0, 10, 10, 8,
        0, 10, 10, 9, 0, 10, 10, 0,
      ],
    ];
    const response: SearchProfilesResponse = {
      flamebearer: { names, levels, numTicks: 100, maxSelf: 10 },
      metadata: { format: 'single', spyName: 'gospy', sampleRate: 100, units: 'samples', name: 'process_cpu' },
      timeline: { startTime: 0, samples: [], durationDelta: 0 },
    };

    expect(transformProfileResponse(response)).toEqual(legacyTransformProfileResponse(response));
  });

  it('produces identical output to the legacy implementation for a deep single-branch chain (recursion-like)', () => {
    const depth = 30;
    const root = buildChain(depth);
    const response = toSearchProfilesResponse(root);

    expect(transformProfileResponse(response)).toEqual(legacyTransformProfileResponse(response));
  });

  it('produces identical output to the legacy implementation when children exactly touch the parent boundaries', () => {
    // Two children whose combined range exactly fills the parent (zero self time), and whose
    // shared boundary is a single point - no gap on either side.
    const root: GeneratedNode = {
      start: 0,
      end: 10,
      self: 0,
      name: 'root',
      children: [
        { start: 0, end: 5, self: 5, name: 'left', children: [] },
        { start: 5, end: 10, self: 5, name: 'right', children: [] },
      ],
    };
    const response = toSearchProfilesResponse(root);

    expect(transformProfileResponse(response)).toEqual(legacyTransformProfileResponse(response));
  });
});

// Builds a single-branch chain `depth` levels deep, where every level fully contains the next
// with zero self time except at the leaf - modeling unbounded recursion into the same range.
function buildChain(depth: number): GeneratedNode {
  if (depth <= 0) {
    return { start: 0, end: 1, self: 1, name: 'recurse', children: [] };
  }
  const child = buildChain(depth - 1);
  return { start: 0, end: child.end, self: 0, name: 'recurse', children: [child] };
}
