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

import { ProfileQueryContext } from '@perses-dev/plugin-system';
import { StackTrace } from '@perses-dev/spec';

import {
  FlameGraph,
  Series,
  PyroscopeClient,
  PyroscopeProfileQuerySpec,
  SelectMergeStacktracesRequest,
  SelectSeriesRequest,
} from '../../model';
import { getProfileData, transformFlameGraph, transformTimeline } from './get-profile-data';

// Flamegraph levels use groups of 4 numbers: [offset, total, self, nameIndex].
// `offset` is the gap (in samples) since the end of the previous sibling on the same level.
//
//            root [0,10)
//           /            \
//      foo [0,6)        bar [6,10)
//      /       \                \
// baz [0,3) qux [3,5)        quux [6,10)
// int64 values arrive as JSON strings over the Connect API; the transform must coerce them.
const MOCK_FLAMEGRAPH: FlameGraph = {
  names: ['root', 'foo', 'bar', 'baz', 'qux', 'quux'],
  levels: [
    { values: ['0', '10', '2', '0'] },
    { values: ['0', '6', '1', '1', '0', '4', '4', '2'] },
    { values: ['0', '3', '3', '3', '0', '2', '2', '4', '1', '4', '4', '5'] },
  ],
  total: '42',
  maxSelf: '4',
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
const MOCK_COMPLEX_FLAMEGRAPH: FlameGraph = {
  names: ['root', 'main', 'cleanup', 'recurse', 'helper'],
  levels: [
    { values: ['0', '20', '0', '0'] },
    { values: ['0', '18', '4', '1', '0', '2', '2', '2'] },
    { values: ['2', '8', '2', '3', '2', '6', '6', '3'] },
    { values: ['2', '4', '4', '3', '1', '2', '2', '4'] },
  ],
  total: '20',
  maxSelf: '6',
};

const EMPTY_STACK_TRACE: StackTrace = { id: 0, name: '', level: 0, start: 0, end: 0, total: 0, self: 0, children: [] };

// Builds a stub PyroscopeClient. Individual test cases override the two methods getProfileData
// actually calls; the rest are present (as no-op mocks) only to satisfy the PyroscopeClient type.
function makeClient(overrides: Partial<PyroscopeClient> = {}): PyroscopeClient {
  return {
    options: { datasourceUrl: 'http://example.com' },
    selectMergeStacktraces: jest.fn(),
    selectSeries: jest.fn(),
    searchProfileTypes: jest.fn(),
    searchLabelNames: jest.fn(),
    searchLabelValues: jest.fn(),
    searchServices: jest.fn(),
    ...overrides,
  };
}

// Builds a stub ProfileQueryContext. `absoluteTimeRange` is omitted by default, matching the
// "no time range selected" case; individual tests pass one in to exercise the other branch.
function createContext(
  client: PyroscopeClient,
  absoluteTimeRange?: ProfileQueryContext['absoluteTimeRange'],
): ProfileQueryContext {
  return {
    datasourceStore: {
      getDatasource: jest.fn(),
      getDatasourceClient: jest.fn(() => Promise.resolve(client)),
      listDatasourceSelectItems: jest.fn(async () => []),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
    absoluteTimeRange,
  } as ProfileQueryContext;
}

const BASE_SPEC: PyroscopeProfileQuerySpec = {
  profileType: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
  service: 'my-service',
  filters: [{ labelName: 'env', operator: '=', labelValue: 'prod' }],
  maxNodes: 100,
};

// A 1-hour window with whole-second boundaries, so the derived milliseconds and step are exact.
const TIME_RANGE = {
  start: new Date('2024-06-11T10:00:00.000Z'),
  end: new Date('2024-06-11T11:00:00.000Z'),
};

describe('getProfileData', () => {
  const EMPTY_PROFILE_DATA = {
    profile: { stackTrace: EMPTY_STACK_TRACE },
    numTicks: 0,
    maxSelf: 0,
    metadata: { spyName: '', sampleRate: 0, units: '', name: '' },
    timeline: { startTime: 0, samples: [], durationDelta: 0 },
  };

  it('returns empty profile data without resolving a client when profileType is missing', async () => {
    const client = makeClient();
    const context = createContext(client, TIME_RANGE);

    const result = await getProfileData({ ...BASE_SPEC, profileType: '' }, context);

    expect(context.datasourceStore.getDatasourceClient).not.toHaveBeenCalled();
    expect(result).toEqual(EMPTY_PROFILE_DATA);
  });

  it('returns empty profile data without resolving a client when service is missing', async () => {
    const client = makeClient();
    const context = createContext(client, TIME_RANGE);

    const result = await getProfileData({ ...BASE_SPEC, service: undefined }, context);

    expect(context.datasourceStore.getDatasourceClient).not.toHaveBeenCalled();
    expect(result).toEqual(EMPTY_PROFILE_DATA);
  });

  it('builds the flame graph and timeline requests from the spec and time range', async () => {
    const selectMergeStacktraces = jest.fn().mockResolvedValue({ flamegraph: MOCK_FLAMEGRAPH });
    const selectSeries = jest.fn().mockResolvedValue({ series: [] });
    const client = makeClient({ selectMergeStacktraces, selectSeries });

    await getProfileData(BASE_SPEC, createContext(client, TIME_RANGE));

    const expectedStacktracesRequest: SelectMergeStacktracesRequest = {
      profileTypeID: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
      labelSelector: '{service_name="my-service",env="prod"}',
      start: 1_718_100_000_000,
      end: 1_718_103_600_000,
      maxNodes: 100,
    };
    expect(selectMergeStacktraces).toHaveBeenCalledWith(expectedStacktracesRequest);

    const expectedSeriesRequest: SelectSeriesRequest = {
      profileTypeID: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
      labelSelector: '{service_name="my-service",env="prod"}',
      start: 1_718_100_000_000,
      end: 1_718_103_600_000,
      step: 10, // 3600s window / 1000 target points = 3.6, floored to 3, floored up to the 10s minimum
      aggregation: 'TIME_SERIES_AGGREGATION_TYPE_SUM',
    };
    expect(selectSeries).toHaveBeenCalledWith(expectedSeriesRequest);
  });

  it('omits maxNodes from the flame graph request when the spec does not set it', async () => {
    const selectMergeStacktraces = jest.fn().mockResolvedValue({ flamegraph: MOCK_FLAMEGRAPH });
    const selectSeries = jest.fn().mockResolvedValue({ series: [] });
    const client = makeClient({ selectMergeStacktraces, selectSeries });

    await getProfileData({ ...BASE_SPEC, maxNodes: undefined }, createContext(client, TIME_RANGE));

    expect(selectMergeStacktraces).toHaveBeenCalledWith(expect.not.objectContaining({ maxNodes: expect.anything() }));
  });

  it('builds a label selector with only service_name when there are no filters', async () => {
    const selectMergeStacktraces = jest.fn().mockResolvedValue({ flamegraph: MOCK_FLAMEGRAPH });
    const selectSeries = jest.fn().mockResolvedValue({ series: [] });
    const client = makeClient({ selectMergeStacktraces, selectSeries });

    await getProfileData({ ...BASE_SPEC, filters: undefined }, createContext(client, TIME_RANGE));

    expect(selectMergeStacktraces).toHaveBeenCalledWith(
      expect.objectContaining({ labelSelector: '{service_name="my-service"}' }),
    );
  });

  it('defaults to the last hour ending now when no absolute time range is provided', async () => {
    const fixedNowMs = 1_718_100_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(fixedNowMs);

    const selectMergeStacktraces = jest.fn().mockResolvedValue({ flamegraph: MOCK_FLAMEGRAPH });
    const selectSeries = jest.fn().mockResolvedValue({ series: [] });
    const client = makeClient({ selectMergeStacktraces, selectSeries });

    await getProfileData(BASE_SPEC, createContext(client, undefined));

    expect(selectMergeStacktraces).toHaveBeenCalledWith(
      expect.objectContaining({ start: fixedNowMs - 3_600_000, end: fixedNowMs }),
    );

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('assembles the final ProfileData from the flame graph and timeline responses', async () => {
    const seriesResponse: Series[] = [
      {
        labels: [],
        points: [
          { timestamp: '1718100000000', value: 1 },
          { timestamp: '1718100010000', value: 2 },
        ],
      },
    ];
    const selectMergeStacktraces = jest.fn().mockResolvedValue({ flamegraph: MOCK_FLAMEGRAPH });
    const selectSeries = jest.fn().mockResolvedValue({ series: seriesResponse });
    const client = makeClient({ selectMergeStacktraces, selectSeries });

    const result = await getProfileData(BASE_SPEC, createContext(client, TIME_RANGE));

    expect(result.numTicks).toBe(42);
    expect(result.maxSelf).toBe(4);
    expect(result.profile.stackTrace.name).toBe('root');
    expect(result.metadata).toEqual({ spyName: '', sampleRate: 0, units: 'nanoseconds', name: 'process_cpu' });
    const timeline = result.timeline;
    expect(timeline).toBeDefined();
    expect(timeline?.startTime).toBe(1_718_100_000);
    expect(timeline?.durationDelta).toBe(10);
    expect(timeline?.samples).toHaveLength(360);
    expect(timeline?.samples[0]).toBe(1);
    expect(timeline?.samples[1]).toBe(2);
    expect(timeline?.samples.slice(2)).toEqual(Array(358).fill(0));
  });

  it('propagates a rejection if either request fails', async () => {
    const selectMergeStacktraces = jest.fn().mockRejectedValue(new Error('flame graph request failed'));
    const selectSeries = jest.fn().mockResolvedValue({ series: [] });
    const client = makeClient({ selectMergeStacktraces, selectSeries });

    await expect(getProfileData(BASE_SPEC, createContext(client, TIME_RANGE))).rejects.toThrow(
      'flame graph request failed',
    );
  });
});

describe('transformFlameGraph', () => {
  it('returns an empty stack trace when there is no flame graph', () => {
    expect(transformFlameGraph(undefined)).toEqual({
      stackTrace: EMPTY_STACK_TRACE,
      numTicks: 0,
      maxSelf: 0,
    });
  });

  it('builds the stack trace tree from the flame graph levels', () => {
    const result = transformFlameGraph(MOCK_FLAMEGRAPH);

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

    expect(result.stackTrace).toEqual(root);
  });

  it('passes through numTicks (flame graph total) and maxSelf', () => {
    const result = transformFlameGraph(MOCK_FLAMEGRAPH);

    expect(result.numTicks).toBe(42);
    expect(result.maxSelf).toBe(4);
  });

  it('returns an empty stack trace when there are no levels', () => {
    const result = transformFlameGraph({ ...MOCK_FLAMEGRAPH, levels: [] });

    expect(result.stackTrace).toEqual(EMPTY_STACK_TRACE);
  });

  it('builds a deeper tree with multiple siblings, gaps between children, and a name reused across call sites', () => {
    const result = transformFlameGraph(MOCK_COMPLEX_FLAMEGRAPH);

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

    expect(result.stackTrace).toEqual(root);
  });
});

describe('transformTimeline', () => {
  // 1_600_000_000_000 ms .. 1_600_000_000_000 + 50_000 ms, at a 10s step -> 5 buckets.
  const START_MS = 1_600_000_000_000;
  const END_MS = START_MS + 50_000;
  const STEP_SECONDS = 10;

  it('returns a zero-filled timeline spanning the full requested window when there is no series', () => {
    expect(transformTimeline(undefined, START_MS, END_MS, STEP_SECONDS)).toEqual({
      startTime: 1_600_000_000,
      samples: [0, 0, 0, 0, 0],
      durationDelta: 10,
    });
    expect(transformTimeline([], START_MS, END_MS, STEP_SECONDS)).toEqual({
      startTime: 1_600_000_000,
      samples: [0, 0, 0, 0, 0],
      durationDelta: 10,
    });
  });

  it('places each point in the bucket matching its timestamp, always starting at the query start', () => {
    const series: Series[] = [
      {
        labels: [],
        points: [
          { timestamp: String(START_MS), value: 1 },
          { timestamp: String(START_MS + 10_000), value: 2 },
          { timestamp: String(START_MS + 40_000), value: 5 },
        ],
      },
    ];

    expect(transformTimeline(series, START_MS, END_MS, STEP_SECONDS)).toEqual({
      startTime: 1_600_000_000,
      samples: [1, 2, 0, 0, 5],
      durationDelta: 10,
    });
  });

  it('spans the full requested range even when the server has no data near the edges (regression: PR #763 review)', () => {
    // The server returns a single point in the middle of the window, none at the start or end.
    // The timeline must still span the whole requested range, not just the returned point(s).
    const series: Series[] = [{ labels: [], points: [{ timestamp: String(START_MS + 20_000), value: 9 }] }];

    const result = transformTimeline(series, START_MS, END_MS, STEP_SECONDS);

    expect(result.startTime).toBe(1_600_000_000); // the query's start, not the point's timestamp
    expect(result.samples).toHaveLength(5); // the full window, not just 1 sample
    expect(result.samples).toEqual([0, 0, 9, 0, 0]);
  });

  it('ignores points outside the requested window', () => {
    const series: Series[] = [
      {
        labels: [],
        points: [
          { timestamp: String(START_MS - 10_000), value: 100 }, // before start
          { timestamp: String(START_MS + 10_000), value: 2 },
          { timestamp: String(END_MS + 10_000), value: 100 }, // at/after end
        ],
      },
    ];

    expect(transformTimeline(series, START_MS, END_MS, STEP_SECONDS).samples).toEqual([0, 2, 0, 0, 0]);
  });

  it('rounds a point that does not land exactly on a bucket boundary down to that bucket', () => {
    const series: Series[] = [{ labels: [], points: [{ timestamp: String(START_MS + 24_000), value: 7 }] }];

    // 24s falls in the [20s, 30s) bucket, i.e. index 2.
    expect(transformTimeline(series, START_MS, END_MS, STEP_SECONDS).samples).toEqual([0, 0, 7, 0, 0]);
  });
});

// copy of transformProfileResponse as it existed before the O(n) rewrite
function legacyTransformFlameGraph(flamegraph: FlameGraph): {
  stackTrace: StackTrace;
  numTicks: number;
  maxSelf: number;
} {
  const stackTraces: StackTrace[][] = [];
  let id = 1;

  for (let i = 0; i < flamegraph.levels.length; i++) {
    let current = 0;
    const row: StackTrace[] = [];
    const level = flamegraph.levels[i]?.values;
    if (!level) {
      continue;
    }

    for (let j = 0; j < level.length; j += 4) {
      const temp: StackTrace = {} as StackTrace;
      temp.id = id;
      id += 1;
      const indexInNamesArray = level[j + 3];
      if (indexInNamesArray !== undefined) {
        const name = flamegraph.names[Number(indexInNamesArray)];
        if (name) {
          temp.name = name;
        }
      }
      temp.level = i;

      const total = level[j + 1];
      if (total !== undefined) {
        temp.total = Number(total);
      }

      const self = level[j + 2];
      if (self !== undefined) {
        temp.self = Number(self);
      }

      const offset = level[j];
      if (offset !== undefined) {
        current += Number(offset);
      }
      temp.start = current;
      if (total !== undefined) {
        current += Number(total);
      }
      temp.end = current;
      temp.children = [];

      row.push(temp);
    }

    stackTraces.push(row);
  }

  legacyAddChildren(stackTraces);

  const stackTrace = stackTraces[0]?.[0] ?? ({} as StackTrace);
  return { stackTrace, numTicks: Number(flamegraph.total), maxSelf: Number(flamegraph.maxSelf) };
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
  namePool: string[],
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

// Flattens the generated tree into the same flat, per-level [offset, total, self, nameIndex]
// encoding used by the real Pyroscope API (offset is cumulative across the whole level).
function toFlameGraph(root: GeneratedNode): FlameGraph {
  const names: string[] = [];
  const levels: FlameGraph['levels'] = [];

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

    levels.push({ values: rawLevel });
    currentLevel = nextLevel;
  }

  return { names, levels, total: root.end - root.start, maxSelf: root.self };
}

describe('transformFlameGraph (regression against the pre-optimization implementation)', () => {
  it('produces identical output to the legacy implementation for many randomly generated profiles', () => {
    // Several independent seeds rather than one, so coverage isn't at the mercy of a single PRNG
    // stream happening (or failing) to hit a given structural edge case.
    const seeds = [42, 7, 1337, 99991, 2024];

    for (const seed of seeds) {
      const rng = createRng(seed);

      for (let i = 0; i < 200; i++) {
        const totalSamples = 20 + Math.floor(rng() * 500);
        const maxDepth = 2 + Math.floor(rng() * 6);
        const flamegraph = toFlameGraph(buildRandomTree(rng, 0, totalSamples, 0, maxDepth, []));

        expect(transformFlameGraph(flamegraph)).toEqual(legacyTransformFlameGraph(flamegraph));
      }
    }
  });

  it('produces identical output to the legacy implementation for a wide flat level (many siblings, no children)', () => {
    const names = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'];
    // 10 siblings at the same level, back-to-back with no gaps, each a leaf - stresses the O(n)
    // parentIndex cursor advancing across many same-level nodes under a single parent.
    const levels: FlameGraph['levels'] = [
      { values: [0, 100, 0, 0] },
      {
        values: [
          0, 10, 10, 1, 0, 10, 10, 2, 0, 10, 10, 3, 0, 10, 10, 4, 0, 10, 10, 5, 0, 10, 10, 6, 0, 10, 10, 7, 0, 10, 10,
          8, 0, 10, 10, 9, 0, 10, 10, 0,
        ],
      },
    ];
    const flamegraph: FlameGraph = { names, levels, total: 100, maxSelf: 10 };

    expect(transformFlameGraph(flamegraph)).toEqual(legacyTransformFlameGraph(flamegraph));
  });

  it('produces identical output to the legacy implementation for a deep single-branch chain (recursion-like)', () => {
    const depth = 30;
    const root = buildChain(depth);
    const flamegraph = toFlameGraph(root);

    expect(transformFlameGraph(flamegraph)).toEqual(legacyTransformFlameGraph(flamegraph));
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
    const flamegraph = toFlameGraph(root);

    expect(transformFlameGraph(flamegraph)).toEqual(legacyTransformFlameGraph(flamegraph));
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
