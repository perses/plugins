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

import type { StackTrace, Timeline } from '@perses-dev/spec';

import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import type { ClickHouseColumn } from '../../model/click-house-types';
import { findColumn } from '../../model/click-house-types';
import { toNumber, toText } from '../../model/values';

const ROOT_FRAME = 'total';
const UNKNOWN_FRAME = '[unknown]';
const DEFAULT_UNIT = 'count';
// Units of the OpenTelemetry profiles, as the flame chart names them.
const UNITS: Record<string, string> = {
  ns: 'nanoseconds',
  nanoseconds: 'nanoseconds',
  by: 'bytes',
  bytes: 'bytes',
  '1': 'count',
  count: 'count',
  '': 'count',
};

interface Frame {
  name: string;
  total: number;
  self: number;
  children: Map<string, Frame>;
}

function newFrame(name: string): Frame {
  return { name, total: 0, self: 0, children: new Map() };
}

// The value of the samples: their `sum(value)` column when the query returns values, else their number.
function findValueColumn(columns: ClickHouseColumn[]): number {
  const sum = columns.findIndex((column) => column.name.toLowerCase() === 'sum(value)');
  return sum !== -1 ? sum : findColumn(columns, ['samples']);
}

export interface BuiltProfile {
  stackTrace: StackTrace;
  /** Total value of the samples. */
  numTicks: number;
  /** Highest self value of a frame. */
  maxSelf: number;
  name: string;
  units: string;
}

// Lays the frames out: each frame spans its total value, its callees next to each other from its start.
function layout(root: Frame): { stackTrace: StackTrace; maxSelf: number } {
  // The flame chart reads an ID of 0 as an empty profile.
  let nextId = root.total > 0 ? 1 : 0;
  let maxSelf = 0;
  const stackTrace: StackTrace = {
    id: nextId++,
    name: root.name,
    level: 0,
    start: 0,
    end: root.total,
    total: root.total,
    self: root.self,
    children: [],
  };
  // Iterative: a recursion as deep as the deepest stack could overflow the call stack.
  const pending: Array<{ frame: Frame; node: StackTrace }> = [{ frame: root, node: stackTrace }];
  for (let entry = pending.pop(); entry; entry = pending.pop()) {
    const { frame, node } = entry;
    maxSelf = Math.max(maxSelf, frame.self);
    let start = node.start;
    // Sorted by name, so that the same profile always draws the same flame graph.
    for (const child of [...frame.children.values()].toSorted((a, b) => (a.name < b.name ? -1 : 1))) {
      const childNode: StackTrace = {
        id: nextId++,
        name: child.name,
        level: node.level + 1,
        start,
        end: start + child.total,
        total: child.total,
        self: child.self,
        children: [],
      };
      node.children.push(childNode);
      pending.push({ frame: child, node: childNode });
      start += child.total;
    }
  }
  return { stackTrace, maxSelf };
}

/**
 * buildProfile reads the result of the statement built by `buildFlameQuery`: one row per distinct stack, with the
 * frames of the stack from the leaf to the root, as in the OpenTelemetry profiles.
 */
export function buildProfile(response: ClickHouseQueryResponse): BuiltProfile {
  const { columns, rows } = response;
  const stack = findColumn(columns, ['stack']);
  const value = findValueColumn(columns);
  const name = findColumn(columns, ['any(name)']);
  const unit = findColumn(columns, ['any(unit)']);
  const root = newFrame(ROOT_FRAME);

  for (const row of rows) {
    const frames: unknown = row[stack];
    const weight = toNumber(row[value]) ?? 0;
    if (!Array.isArray(frames) || weight <= 0) continue;
    root.total += weight;
    let current = root;
    for (let index = frames.length - 1; index >= 0; index--) {
      const frameName = toText(frames[index]) || UNKNOWN_FRAME;
      let child = current.children.get(frameName);
      if (!child) {
        child = newFrame(frameName);
        current.children.set(frameName, child);
      }
      child.total += weight;
      current = child;
    }
    current.self += weight;
  }

  const firstRow = rows[0];
  const rawUnit = firstRow && unit !== -1 ? toText(firstRow[unit]) : '';
  return {
    ...layout(root),
    numTicks: root.total,
    name: firstRow && name !== -1 ? toText(firstRow[name]) : '',
    units: UNITS[rawUnit.toLowerCase()] ?? (rawUnit || DEFAULT_UNIT),
  };
}

/**
 * buildTimeline reads the result of the statement built by `buildTimelineQuery` as the value of the samples over
 * the time range, one point per time bucket. Buckets without samples are 0.
 */
export function buildTimeline(
  response: ClickHouseQueryResponse,
  startMs: number,
  endMs: number,
  stepSeconds: number,
): Timeline {
  // Buckets start at multiples of the step, as `toStartOfInterval` aligns them.
  const startTime = Math.floor(startMs / 1000 / stepSeconds) * stepSeconds;
  const timeline: Timeline = { startTime, samples: [], durationDelta: stepSeconds };
  const { columns } = response;
  const value = findValueColumn(columns);
  const samples = findColumn(columns, ['samples']);
  // The buckets are the column that is not a total: a query without a "time" column has none, and no timeline.
  const bucket = columns.findIndex((_column, index) => index !== value && index !== samples);
  if (bucket === -1) return timeline;
  const count = Math.max(0, Math.floor((endMs / 1000 - startTime) / stepSeconds) + 1);
  timeline.samples = Array<number>(count).fill(0);
  for (const row of response.rows) {
    const time = toNumber(row[bucket]);
    const index = time === null ? -1 : Math.round((time - startTime) / stepSeconds);
    if (index >= 0 && index < count) {
      timeline.samples[index] = toNumber(row[value]) ?? 0;
    }
  }
  return timeline;
}
