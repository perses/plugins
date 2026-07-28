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
import { getUnixTime } from 'date-fns';
import { AbsoluteTimeRange, ProfileData, StackTrace } from '@perses-dev/spec';
import {
  PyroscopeProfileQuerySpec,
  PYROSCOPE_DATASOURCE_KIND,
  PyroscopeDatasourceSelector,
  PyroscopeClient,
  SearchProfilesParameters,
  SearchProfilesResponse,
} from '../../model';
import { computeFilterExpr } from '../../utils/types';

export function getUnixTimeRange(timeRange: AbsoluteTimeRange): { start: number; end: number } {
  const { start, end } = timeRange;
  return {
    start: Math.ceil(getUnixTime(start)),
    end: Math.ceil(getUnixTime(end)),
  };
}

export const getProfileData: ProfileQueryPlugin<PyroscopeProfileQuerySpec>['getProfileData'] = async (
  spec,
  context
) => {
  const defaultPyroscopeDatasource: PyroscopeDatasourceSelector = {
    kind: PYROSCOPE_DATASOURCE_KIND,
  };

  const client: PyroscopeClient = await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? defaultPyroscopeDatasource
  );

  const buildQueryString = (): string => {
    let query: string = '';
    if (spec.service) {
      query = `service_name="${spec.service}"`;
    }
    if (spec.filters && spec.filters.length > 0) {
      const filterExpr = computeFilterExpr(spec.filters);
      if (query === '') {
        query = filterExpr;
      } else {
        query += ',' + filterExpr;
      }
    }
    query = spec.profileType + (query === '' ? '' : '{' + query + '}');
    return query;
  };

  const getParams = (): SearchProfilesParameters => {
    const params: SearchProfilesParameters = {
      // example of query
      // query: `process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="pyroscope"}`,
      query: buildQueryString(),
      // the default value is now-1h
      from: 'now-1h',
    };

    // handle time range selection from UI drop down (e.g. last 5 minutes, last 1 hour )
    if (context.absoluteTimeRange) {
      const { start, end } = getUnixTimeRange(context.absoluteTimeRange);
      params.from = start;
      params.until = end;
    }

    if (spec.maxNodes) {
      params.maxNodes = spec.maxNodes;
    }

    return params;
  };

  const response = await client.searchProfiles(getParams());

  // return a profile data
  return transformProfileResponse(response);
};

// [offset, total, self, nameIndex].
const FLAMEBEARER_NODE_SIZE = 4;

export function transformProfileResponse(response: SearchProfilesResponse): ProfileData {
  if (!response) {
    return emptyProfileData();
  }

  const { flamebearer, metadata, timeline } = response;

  let id = 1;

  let root: StackTrace | undefined;

  let parentLevel: StackTrace[] = [];

  for (let depth = 0; depth < flamebearer.levels.length; depth++) {
    const level = flamebearer.levels[depth];
    if (!level) {
      continue;
    }

    const currentLevel: StackTrace[] = [];
    let cursor = 0;
    let parentIndex = 0;

    for (let slot = 0; slot < level.length; slot += FLAMEBEARER_NODE_SIZE) {
      const offset = level[slot] ?? 0;
      const total = level[slot + 1] ?? 0;
      const self = level[slot + 2] ?? 0;
      const nameIndex = level[slot + 3] ?? 0;

      const start = cursor + offset;
      const end = start + total;
      cursor = end;

      const node: StackTrace = {
        id: id++,
        name: flamebearer.names[nameIndex] ?? '',
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
    profile: { stackTrace: root ?? emptyStackTrace() },
    numTicks: flamebearer.numTicks,
    maxSelf: flamebearer.maxSelf,
    metadata: {
      spyName: metadata.spyName,
      sampleRate: metadata.sampleRate,
      units: metadata.units,
      name: metadata.name,
    },
    timeline: {
      startTime: timeline.startTime,
      samples: timeline.samples,
      durationDelta: timeline.durationDelta,
    },
  };
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
