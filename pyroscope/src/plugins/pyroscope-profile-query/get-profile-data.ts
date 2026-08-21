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

import { ProfileQueryPlugin } from '@perses-dev/plugin-system';
import { AbsoluteTimeRange, ProfileData, StackTrace, Timeline } from '@perses-dev/spec';
import { getUnixTime } from 'date-fns';

import {
  PyroscopeProfileQuerySpec,
  isProfileQueryComplete,
  DEFAULT_PYROSCOPE,
  PyroscopeClient,
  SelectMergeStacktracesRequest,
  SelectSeriesRequest,
  FlameGraph,
  Series,
} from '../../model';
import { computeFilterExpr } from '../../utils/types';

// Pyroscope's Connect API expects timestamps in milliseconds; Perses time ranges are in seconds.
const MILLISECONDS = 1_000;

// Timeline resolution: target at most this many points, but never a step below MIN_STEP_SECONDS
const TIMELINE_TARGET_POINTS = 1_000;
const MIN_STEP_SECONDS = 10;

export function getUnixTimeRange(timeRange: AbsoluteTimeRange): { start: number; end: number } {
  const { start, end } = timeRange;
  return {
    start: Math.ceil(getUnixTime(start)),
    end: Math.ceil(getUnixTime(end)),
  };
}

export const getProfileData: ProfileQueryPlugin<PyroscopeProfileQuerySpec>['getProfileData'] = async (
  spec,
  context,
) => {
  if (!isProfileQueryComplete(spec)) {
    return emptyProfileData();
  }
  const profileTypeID = spec.profileType;

  const client: PyroscopeClient = await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_PYROSCOPE,
  );

  let startSeconds: number;
  let endSeconds: number;
  if (context.absoluteTimeRange) {
    ({ start: startSeconds, end: endSeconds } = getUnixTimeRange(context.absoluteTimeRange));
  } else {
    endSeconds = Math.ceil(Date.now() / MILLISECONDS);
    startSeconds = endSeconds - 3600;
  }
  const start = startSeconds * MILLISECONDS;
  const end = endSeconds * MILLISECONDS;

  const labelSelector = buildLabelSelector(spec);

  const stacktracesRequest: SelectMergeStacktracesRequest = {
    profileTypeID,
    labelSelector,
    start,
    end,
  };
  if (spec.maxNodes) {
    stacktracesRequest.maxNodes = spec.maxNodes;
  }

  const step = Math.max(MIN_STEP_SECONDS, Math.floor((endSeconds - startSeconds) / TIMELINE_TARGET_POINTS));
  const seriesRequest: SelectSeriesRequest = {
    profileTypeID,
    labelSelector,
    start,
    end,
    step,
    aggregation: 'TIME_SERIES_AGGREGATION_TYPE_SUM',
  };

  const [stacktracesResponse, seriesResponse] = await Promise.all([
    client.selectMergeStacktraces(stacktracesRequest),
    client.selectSeries(seriesRequest),
  ]);

  const { stackTrace, numTicks, maxSelf } = transformFlameGraph(stacktracesResponse.flamegraph);

  return {
    profile: { stackTrace },
    numTicks,
    maxSelf,
    metadata: buildMetadata(profileTypeID),
    timeline: transformTimeline(seriesResponse.series, start, end, step),
  };
};

/**
 * Builds the shared label selector string, e.g. `{service_name="app",env="prod"}`.
 * Returns `{}` when neither a service nor any filter is set.
 */
function buildLabelSelector(spec: PyroscopeProfileQuerySpec): string {
  const selectors: string[] = [];
  if (spec.service) {
    selectors.push(`service_name="${spec.service}"`);
  }
  if (spec.filters && spec.filters.length > 0) {
    const filterExpr = computeFilterExpr(spec.filters);
    if (filterExpr) {
      selectors.push(filterExpr);
    }
  }
  return `{${selectors.join(',')}}`;
}

/**
 * Derives the metadata the panel needs from the profile type ID, which has the form
 * `<name>:<type>:<unit>:<period_type>:<period_unit>`.
 */
function buildMetadata(profileTypeID: string): ProfileData['metadata'] {
  const parts = profileTypeID.split(':');
  return {
    spyName: '',
    sampleRate: 0,
    units: parts[2] ?? '',
    name: parts[0] ?? '',
  };
}

// [offset, total, self, nameIndex].
const FLAME_GRAPH_NODE_SIZE = 4;

export function transformFlameGraph(flamegraph: FlameGraph | undefined): {
  stackTrace: StackTrace;
  numTicks: number;
  maxSelf: number;
} {
  if (!flamegraph) {
    return { stackTrace: emptyStackTrace(), numTicks: 0, maxSelf: 0 };
  }

  const { names, levels } = flamegraph;

  let id = 1;
  let root: StackTrace | undefined;
  let parentLevel: StackTrace[] = [];

  for (let depth = 0; depth < levels.length; depth++) {
    const level = levels[depth]?.values;
    if (!level) {
      continue;
    }

    const currentLevel: StackTrace[] = [];
    let cursor = 0;
    let parentIndex = 0;

    for (let slot = 0; slot < level.length; slot += FLAME_GRAPH_NODE_SIZE) {
      const offset = Number(level[slot] ?? 0);
      const total = Number(level[slot + 1] ?? 0);
      const self = Number(level[slot + 2] ?? 0);
      const nameIndex = Number(level[slot + 3] ?? 0);

      const start = cursor + offset;
      const end = start + total;
      cursor = end;

      const node: StackTrace = {
        id: id++,
        name: names[nameIndex] ?? '',
        level: depth,
        start,
        end,
        total,
        self,
        children: [],
      };

      while (parentIndex + 1 < parentLevel.length) {
        const nextParent = parentLevel[parentIndex + 1];
        if (!nextParent || nextParent.start > start) {
          break;
        }
        parentIndex++;
      }
      const parent = parentLevel[parentIndex];
      if (parent && start >= parent.start && end <= parent.end) {
        parent.children.push(node);
      }

      if (root === undefined) {
        root = node;
      }
      currentLevel.push(node);
    }

    parentLevel = currentLevel;
  }

  return {
    stackTrace: root ?? emptyStackTrace(),
    numTicks: Number(flamegraph.total),
    maxSelf: Number(flamegraph.maxSelf),
  };
}

/**
 * Converts a Pyroscope SelectSeries response into the Perses timeline shape
 */
export function transformTimeline(
  series: Series[] | undefined,
  startMs: number,
  endMs: number,
  stepSeconds: number,
): Timeline {
  const startSeconds = Math.floor(startMs / MILLISECONDS);
  const sampleCount = Math.max(0, Math.ceil((endMs - startMs) / MILLISECONDS / stepSeconds));
  const samples = Array<number>(sampleCount).fill(0);

  for (const point of series?.[0]?.points ?? []) {
    const offsetSeconds = Number(point.timestamp) / MILLISECONDS - startSeconds;
    const index = Math.floor(offsetSeconds / stepSeconds);
    if (index >= 0 && index < samples.length) {
      samples[index] = point.value;
    }
  }

  return { startTime: startSeconds, samples, durationDelta: stepSeconds };
}

function emptyStackTrace(): StackTrace {
  return { id: 0, name: '', level: 0, start: 0, end: 0, total: 0, self: 0, children: [] };
}

function emptyProfileData(): ProfileData {
  return {
    profile: { stackTrace: emptyStackTrace() },
    numTicks: 0,
    maxSelf: 0,
    metadata: { spyName: '', sampleRate: 0, units: '', name: '' },
    timeline: { startTime: 0, samples: [], durationDelta: 0 },
  };
}
