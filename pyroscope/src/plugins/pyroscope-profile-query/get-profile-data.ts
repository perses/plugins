// Copyright 2025 The Perses Authors
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
import { AbsoluteTimeRange, StackTrace, ProfileData } from '@perses-dev/core';
import { getUnixTime } from 'date-fns';
import { PyroscopeProfileQuerySpec, PYROSCOPE_DATASOURCE_KIND, PyroscopeDatasourceSelector } from '../../model';
import { PyroscopeClient } from '../../model/pyroscope-client';
import { SearchProfilesParameters, SearchProfilesResponse } from '../../model/api-types';
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

  const buildQueryString = () => {
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

/**
 * This function transform the Pyroscope response into the Perses profile format
 */
function transformProfileResponse(response: SearchProfilesResponse): ProfileData {
  const newResponse: ProfileData = {
    profile: {
      stackTrace: {} as StackTrace,
    },
    numTicks: 0,
    maxSelf: 0,
    metadata: {
      spyName: '',
      sampleRate: 0,
      units: '',
      name: '',
    },
    timeline: {
      startTime: 0,
      samples: [],
      durationDelta: 0,
    },
  };

  if (!response) {
    return newResponse;
  }

  const stackTraces: StackTrace[][] = [];

  // stackTraces id from 1
  let id = 1;
  // Set the profile stackTrace property
  for (let i = 0; i < response.flamebearer.levels.length; i++) {
    let current = 0;
    const row: StackTrace[] = [];
    for (let j = 0; j < response.flamebearer.levels[i].length; j += 4) {
      const temp: StackTrace = {} as StackTrace;
      temp.id = id;
      id += 1;
      const indexInNamesArray = response.flamebearer.levels[i][j + 3]; // index in names array
      temp.name = response.flamebearer.names[indexInNamesArray];
      temp.level = i;
      temp.total = response.flamebearer.levels[i][j + 1];
      temp.self = response.flamebearer.levels[i][j + 2];

      // start and end
      current += response.flamebearer.levels[i][j]; // current += offset
      temp.start = current;
      current += response.flamebearer.levels[i][j + 1]; // current += total
      temp.end = current;

      temp.children = [];

      row.push(temp);
    }

    stackTraces.push(row);
  }

  addChildren(stackTraces); // adding children to nodes
  newResponse.profile.stackTrace = stackTraces[0][0];

  // Set other properties
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

// todo: optimize this method as soon as possible
function addChildren(stackTraces: StackTrace[][]): void {
  // for (let i = stackTraces.length - 1; i > 0; i--) {
  for (let i = 1; i < stackTraces.length; i++) {
    for (let j = 0; j < stackTraces[i].length; j++) {
      for (let k = 0; k < stackTraces[i - 1].length; k++) {
        if (
          stackTraces[i][j].start >= stackTraces[i - 1][k].start &&
          stackTraces[i][j].end <= stackTraces[i - 1][k].end
        ) {
          stackTraces[i - 1][k].children.push(stackTraces[i][j]);
          break;
        }
      }
    }
  }
}
