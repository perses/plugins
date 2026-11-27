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

import type { ProfileQueryPlugin } from '@perses-dev/plugin-system';
import { isVariableDatasource } from '@perses-dev/plugin-system';
import type { Notice, ProfileData } from '@perses-dev/spec';

import { ClickHouseError } from '../../model/click-house-client';
import { getIntervalMs, prepareQuery, runStatement, truncationNotices } from '../../model/execute-query';
import { parseQueryVariables } from '../../model/macros';
import type { ClickHouseProfileQuerySpec } from './click-house-profile-query-types';
import { buildProfile, buildTimeline } from './profile';
import { buildFlameQuery, buildTimelineQuery } from './profile-sql';

// Error code of ClickHouse for a column that does not exist.
const UNKNOWN_IDENTIFIER = 47;
// Time range of a profile when the context does not provide one.
const DEFAULT_RANGE_MS = 60 * 60 * 1000;

function emptyProfile(): ProfileData {
  return {
    profile: { stackTrace: { id: 0, name: '', level: 0, start: 0, end: 0, total: 0, self: 0, children: [] } },
    numTicks: 0,
    maxSelf: 0,
    metadata: { spyName: '', sampleRate: 0, units: '', name: '' },
    timeline: { startTime: 0, samples: [], durationDelta: 0 },
  };
}

export const getProfileData: ProfileQueryPlugin<ClickHouseProfileQuerySpec>['getProfileData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (!spec.query?.trim()) {
    return emptyProfile();
  }
  // Without the dashboard variables, a datasource variable would be read as the default datasource.
  if (isVariableDatasource(spec.datasource)) {
    throw new Error(
      `Dashboard variables are not available to profile queries: select a datasource instead of ${spec.datasource}.`,
    );
  }

  const now = Date.now();
  const timeRange = context.absoluteTimeRange ?? { start: new Date(now - DEFAULT_RANGE_MS), end: new Date(now) };
  // Profile queries are not given the dashboard variables: only the macros are replaced.
  const queryContext = { datasourceStore: context.datasourceStore, variableState: {}, timeRange };
  const { sql } = prepareQuery(spec.query, queryContext);
  const stepSeconds = getIntervalMs(timeRange, undefined) / 1000;
  const flameStatement = buildFlameQuery(sql);

  const [flame, timeline] = await Promise.all([
    runStatement(spec.datasource, flameStatement, queryContext, abortSignal).catch((error: unknown) => {
      if (error instanceof ClickHouseError && error.code === UNKNOWN_IDENTIFIER) {
        throw new Error(
          `${error.message} A profile query must return a "stack" column: the array of the frames of each sample, from the leaf to the root.`,
          { cause: error },
        );
      }
      throw error;
    }),
    runStatement(spec.datasource, buildTimelineQuery(sql, stepSeconds), queryContext, abortSignal),
  ]);

  const { stackTrace, numTicks, maxSelf, name, units } = buildProfile(flame);
  const notices: Notice[] = truncationNotices(flame);
  const variables = parseQueryVariables(sql);
  if (variables.length > 0) {
    notices.push({
      type: 'warning',
      message: `Dashboard variables are not available to profile queries: ${variables.map((variable) => `$${variable}`).join(', ')} is sent as is.`,
    });
  }

  return {
    profile: { stackTrace },
    numTicks,
    maxSelf,
    timeline: buildTimeline(timeline, timeRange.start.getTime(), timeRange.end.getTime(), stepSeconds),
    metadata: {
      spyName: '',
      sampleRate: 0,
      units,
      name,
      executedQueryString: flameStatement,
      ...(notices.length > 0 && { notices }),
    },
  };
};
