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

import type { AnnotationPlugin } from '@perses-dev/plugin-system';
import type { AnnotationData } from '@perses-dev/spec';

import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import { findColumn, getTypeTimeZone, isTimeType } from '../../model/click-house-types';
import { executeQuery } from '../../model/execute-query';
import { addLabels, toText, toUnixMs } from '../../model/values';
import type { ClickHouseSQLAnnotationSpec } from './click-house-sql-annotation-types';

/** Names of the column holding the start of an annotation, by priority, compared case-insensitively. */
const START_COLUMNS = ['start', 'time', 'timestamp'] as const;

/**
 * buildAnnotations converts a result into annotations. Each row is an annotation: it starts at its `start` or
 * `time` column, or else at its first date/time column, and spans up to its `end` column when it has one. Its
 * `title` and `legend` columns are its texts, and its other columns are its tags.
 */
export function buildAnnotations(response: ClickHouseQueryResponse): AnnotationData[] {
  const { columns, rows } = response;
  const end = findColumn(columns, ['end']);
  const named = findColumn(columns, START_COLUMNS);
  const start = named !== -1 ? named : columns.findIndex((column, index) => index !== end && isTimeType(column.type));
  if (rows.length > 0 && start === -1) {
    throw new Error('An annotation query must return a "time" column, or a "start" and an "end" column.');
  }
  const startTimeZone = getTypeTimeZone(columns[start]?.type ?? '') ?? response.timeZone;
  const endTimeZone = getTypeTimeZone(columns[end]?.type ?? '') ?? response.timeZone;
  const title = findColumn(columns, ['title']);
  const legend = findColumn(columns, ['legend']);

  const annotations: AnnotationData[] = [];
  for (const row of rows) {
    const startMs = toUnixMs(row[start], startTimeZone);
    if (Number.isNaN(startMs)) continue;
    const annotation: AnnotationData = { start: startMs };
    const endMs = end === -1 ? NaN : toUnixMs(row[end], endTimeZone);
    // An end at or before the start is no time span: the annotation is a point in time.
    if (endMs > startMs) annotation.end = endMs;
    const titleText = title === -1 ? '' : toText(row[title]);
    if (titleText) annotation.title = titleText;
    const legendText = legend === -1 ? '' : toText(row[legend]);
    if (legendText) annotation.legend = legendText;

    const tags: Record<string, string> = {};
    for (let index = 0; index < columns.length; index++) {
      if (index !== start && index !== end && index !== title && index !== legend) {
        addLabels(tags, columns[index]?.name ?? '', row[index]);
      }
    }
    for (const name of Object.keys(tags)) {
      if (tags[name] === '') delete tags[name];
    }
    if (Object.keys(tags).length > 0) annotation.tags = tags;
    annotations.push(annotation);
  }
  return annotations;
}

export const getAnnotationData: AnnotationPlugin<ClickHouseSQLAnnotationSpec>['getAnnotationData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (!spec.query?.trim()) {
    return [];
  }
  const result = await executeQuery(
    spec,
    {
      datasourceStore: context.datasourceStore,
      variableState: context.variableState,
      timeRange: context.absoluteTimeRange,
    },
    abortSignal,
  );
  return buildAnnotations(result);
};
