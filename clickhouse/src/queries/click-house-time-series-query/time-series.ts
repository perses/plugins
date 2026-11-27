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

import type {
  Exemplar,
  Labels,
  Notice,
  TimeSeries,
  TimeSeriesExemplars,
  TimeSeriesHistogramTuple,
  TimeSeriesValueTuple,
} from '@perses-dev/spec';

import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import type { ClickHouseColumn } from '../../model/click-house-types';
import { findColumn, findTimeColumn, getTypeTimeZone, isArrayType, isNumericType } from '../../model/click-house-types';
import { addLabels, toNumber, toText, toUnixMs } from '../../model/values';
import type { HistogramColumns } from './histograms';
import { findHistogramColumns, histogramColumnIndexes, readHistogram } from './histograms';

/** Maximum number of series returned by a query. */
export const MAX_SERIES = 1000;

/** Name of the label holding the name of the value column, when a result has several of them. */
export const NAME_LABEL = '__name__';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/** Maximum number of slots of the time grid of a result. Charts fill each of them, for every series. */
const MAX_GRID_SLOTS = 11_000;
/** Maximum number of slots of the time grids of all the series of a result. */
const MAX_GRID_POINTS = 2_000_000;
// Durations the usual interval of the points is rounded to, from the roundest one. Charts draw the series of several
// queries on the common divisor of their steps, which must not be a tiny one.
const ROUND_STEPS = [12 * HOUR, HOUR, MINUTE, SECOND];
// How far a rounded interval may be from the usual one. The points of a long series then drift from their slots: a
// few of them are a slot off, which is better than an odd step.
const ROUNDING_TOLERANCE = 0.005;
// How far from the most common interval the intervals of points written at regular intervals are: the months of a
// year, the days around a daylight saving time change, the jitter of a collector.
const INTERVAL_TOLERANCE = 0.15;
// Share of the points that may be in a slot of their usual interval that is already taken.
const SHARED_SLOTS_TOLERANCE = 0.01;

// Columns of the metric tables of the OpenTelemetry Collector that describe a data point without identifying its
// series nor being its value. They are left out of the rows read from these tables, e.g. with `SELECT *`.
const OTEL_METRIC_COLUMNS = ['metricname', 'timeunix'];
const OTEL_BOOKKEEPING_COLUMNS = new Set([
  'starttimeunix',
  'flags',
  'scopedroppedattrcount',
  'aggregationtemporality',
  'ismonotonic',
  'resourceschemaurl',
  'scopeschemaurl',
  'metricdescription',
  'min',
  'max',
]);

/** Columns holding the exemplars of a data point, as written by the ClickHouse exporter of the Collector. */
interface ExemplarColumns {
  time: number;
  value: number;
  traceId: number;
  spanId: number;
  attributes: number;
}

interface ColumnRoles {
  /** Index of the time column, or -1 when the rows have no timestamp. */
  time: number;
  timeZone: string | undefined;
  values: number[];
  labels: number[];
  histogram?: HistogramColumns;
  exemplars?: ExemplarColumns;
}

function findExemplarColumns(columns: ClickHouseColumn[]): ExemplarColumns | undefined {
  const time = findColumn(columns, ['exemplars.timeunix']);
  const value = findColumn(columns, ['exemplars.value']);
  if (time === -1 || value === -1) return undefined;
  return {
    time,
    value,
    traceId: findColumn(columns, ['exemplars.traceid']),
    spanId: findColumn(columns, ['exemplars.spanid']),
    attributes: findColumn(columns, ['exemplars.filteredattributes']),
  };
}

/**
 * classifyColumns tells what each column of a result is: the timestamp of the rows, a value (numeric types), part of
 * a histogram or of the exemplars, or a label (everything else). Arrays that are not part of a histogram or of the
 * exemplars are ignored: they can not identify a series.
 */
export function classifyColumns(columns: ClickHouseColumn[], serverTimeZone?: string): ColumnRoles {
  const time = findTimeColumn(columns);
  const timeColumn = columns[time];
  const histogram = findHistogramColumns(columns);
  const exemplars = findExemplarColumns(columns);
  const isOtelMetric = OTEL_METRIC_COLUMNS.every((name) => findColumn(columns, [name]) !== -1);
  const special = histogram ? histogramColumnIndexes(histogram) : new Set<number>();

  const values: number[] = [];
  const labels: number[] = [];
  for (let index = 0; index < columns.length; index++) {
    const column = columns[index];
    if (!column || index === time || special.has(index)) continue;
    if (isOtelMetric && OTEL_BOOKKEEPING_COLUMNS.has(column.name.toLowerCase())) continue;
    if (isArrayType(column.type)) continue;
    if (isNumericType(column.type)) {
      // The values of a histogram are its buckets: its other numbers are not series of their own.
      if (!histogram) values.push(index);
    } else {
      labels.push(index);
    }
  }
  return {
    time,
    timeZone: (timeColumn && getTypeTimeZone(timeColumn.type)) ?? serverTimeZone,
    values,
    labels,
    histogram,
    exemplars,
  };
}

/** labelsKey returns a key identifying a set of labels whatever their order. */
export function labelsKey(labels: Labels): string {
  return JSON.stringify(
    Object.keys(labels)
      .toSorted()
      .map((name) => [name, labels[name]]),
  );
}

/** formatSelector writes labels as a selector, e.g. `{service="api", env="prod"}`. */
function formatSelector(labels: Labels): string {
  return `{${Object.entries(labels)
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
    .join(', ')}}`;
}

/** formatSeriesName replaces the `{{label}}` references of a series name format with the values of the labels. */
export function formatSeriesName(format: string, labels: Labels): string {
  return format.replace(/\{\{\s*(.+?)\s*\}\}/g, (_match, name: string) => labels[name] ?? '');
}

interface SeriesGroup {
  labels: Labels;
  key: string;
  /** One list of points per value column. */
  values: TimeSeriesValueTuple[][];
  histograms: TimeSeriesHistogramTuple[];
  exemplars: Exemplar[];
}

function readExemplars(row: unknown[], columns: ExemplarColumns, timeZone: string | undefined): Exemplar[] {
  const times = row[columns.time];
  const values = row[columns.value];
  if (!Array.isArray(times) || !Array.isArray(values)) return [];
  const traceIds: unknown = row[columns.traceId];
  const spanIds: unknown = row[columns.spanId];
  const attributes: unknown = row[columns.attributes];
  const exemplars: Exemplar[] = [];
  for (let index = 0; index < values.length; index++) {
    const value = toNumber(values[index]);
    const timestamp = toUnixMs(times[index], timeZone);
    if (value === null || Number.isNaN(timestamp)) continue;
    const labels: Labels = {};
    if (Array.isArray(attributes)) {
      for (const [name, attribute] of Object.entries(attributes[index] ?? {})) {
        labels[name] = toText(attribute);
      }
    }
    const traceId = Array.isArray(traceIds) ? toText(traceIds[index]) : '';
    const spanId = Array.isArray(spanIds) ? toText(spanIds[index]) : '';
    if (traceId) labels.trace_id = traceId;
    if (spanId) labels.span_id = spanId;
    exemplars.push({ timestamp, value, labels });
  }
  return exemplars;
}

function greatestCommonDivisor(a: number, b: number): number {
  let [dividend, divisor] = [a, b];
  while (divisor !== 0) {
    [dividend, divisor] = [divisor, dividend % divisor];
  }
  return dividend;
}

// The intervals between the consecutive points of each series, in whole milliseconds. They are measured within
// each series: series written at different times of the same interval do not shrink them.
function intervalsOf(series: TimeSeries[]): number[] {
  const intervals: number[] = [];
  for (const { values } of series) {
    for (let index = 1; index < values.length; index++) {
      const interval = Math.round((values[index]?.[0] ?? 0) - (values[index - 1]?.[0] ?? 0));
      if (interval > 0) intervals.push(interval);
    }
  }
  return intervals;
}

// The interval the points are usually at, when most of them are at about the same one: the average of the intervals
// close to the most common one, rounded to a round duration when it is close to one. `longest` is the number of
// intervals of the longest series.
function usualInterval(intervals: number[], longest: number): number | undefined {
  const counts = new Map<number, number>();
  for (const interval of intervals) {
    counts.set(interval, (counts.get(interval) ?? 0) + 1);
  }
  let mostCommon = 0;
  let mostCommonCount = 0;
  for (const [interval, count] of counts) {
    // The shortest of the most common ones: a longer one is a hole in a series.
    if (count > mostCommonCount || (count === mostCommonCount && interval < mostCommon)) {
      mostCommon = interval;
      mostCommonCount = count;
    }
  }
  let sum = 0;
  let count = 0;
  for (const interval of intervals) {
    if (Math.abs(interval - mostCommon) <= mostCommon * INTERVAL_TOLERANCE) {
      sum += interval;
      count++;
    }
  }
  if (count * 2 <= intervals.length) return undefined;

  const average = sum / count;
  // A short series can not tell its interval precisely, e.g. three days around a daylight saving time change: its
  // points may be a quarter of a slot off at its end.
  const tolerance = Math.max(ROUNDING_TOLERANCE, 1 / (4 * longest));
  for (const unit of ROUND_STEPS) {
    const rounded = Math.round(average / unit) * unit;
    if (rounded > 0 && Math.abs(rounded - average) <= average * tolerance) return rounded;
  }
  return Math.max(1, Math.round(average));
}

// The smallest of 1, 2, 5, 10, 20, 50... that is at least a number: a step stays round when it is stretched.
function roundMultiple(least: number): number {
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const factor of [1, 2, 5]) {
      if (magnitude * factor >= least) return magnitude * factor;
    }
  }
}

// Whole seconds keep the timestamps of the histograms, which are in seconds, exact.
function gridAnchor(first: number, stepMs: number): number {
  return stepMs % SECOND === 0 ? Math.floor(first / SECOND) * SECOND : first;
}

// Number of slots between the first point of a series and another one of its points, on a time grid.
function slotsAfter(first: number, timestamp: number, stepMs: number): number {
  return Math.round((timestamp - first) / stepMs);
}

// Counts the points of the series that are in the same slot of a time grid as the point before them.
function countSharedSlots(series: TimeSeries[], stepMs: number): number {
  let shared = 0;
  for (const { values } of series) {
    const first = values[0]?.[0] ?? 0;
    let previous: number | undefined;
    for (const [timestamp] of values) {
      const slot = slotsAfter(first, timestamp, stepMs);
      if (slot === previous) shared++;
      previous = slot;
    }
  }
  return shared;
}

/**
 * chooseStepMs returns the step of the time grid the points of the series are put on. Charts draw each series on
 * this grid, one point per slot, and only join the points of consecutive slots: the step is the interval between
 * two points.
 *
 * - When most points are at about the same interval, it is this interval: a metric written every minute and
 *   grouped by shorter intervals, the points of a collector, the months of a year. Close to no points may share a
 *   slot.
 * - Else it is the common divisor of the intervals between the points, the grid all of them are exactly on: a
 *   series with more holes than points keeps its points where they are.
 *
 * The step is never so short that charts would fill more slots than they can.
 */
function chooseStepMs(series: TimeSeries[], first: number, last: number, options: BuildTimeSeriesOptions): number {
  const stepMs = naturalStepMs(series, options);
  // A multiple of the step keeps the points that are on its grid on the one of the longer step.
  const maxSlots = Math.min(MAX_GRID_SLOTS, Math.max(1, Math.floor(MAX_GRID_POINTS / series.length)));
  const extent = Math.max(options.instant, last) - Math.min(options.rangeStart, first);
  return stepMs * roundMultiple(extent / (stepMs * maxSlots));
}

// The step the points of the series are at, before it is stretched to fit the charts.
function naturalStepMs(series: TimeSeries[], options: BuildTimeSeriesOptions): number {
  const intervals = intervalsOf(series);
  // A single point per series tells nothing.
  if (intervals.length === 0) return options.intervalMs;

  let longest = 1;
  for (const { values } of series) {
    longest = Math.max(longest, values.length - 1);
  }
  const divisor = intervals.reduce(greatestCommonDivisor);
  const usual = usualInterval(intervals, longest);
  // The drift of points written slightly more often than their usual interval puts a few of them in a slot that is
  // already taken. More of them means that the points have no usual interval.
  const fits =
    usual !== undefined &&
    usual >= 2 * divisor &&
    countSharedSlots(series, usual) <= intervals.length * SHARED_SLOTS_TOLERANCE;
  return fits ? usual : divisor;
}

// Moves the points of a series onto the time grid `start + n * stepMs` the charts draw on: its first point to the
// nearest slot, and the next ones as many slots after it as they are steps after it. Counting from the first point
// rather than from the start of the grid keeps a series written halfway between two slots on one side of them.
// Points sharing a slot are merged, the last one winning: without this, a chart would shift each of them to the
// next free slot.
function alignToGrid<T extends [number, unknown]>(points: T[], start: number, stepMs: number, scale = 1): T[] {
  const first = (points[0]?.[0] ?? 0) * scale;
  const firstSlot = Math.round((first - start) / stepMs);
  const aligned: T[] = [];
  let lastSlot: number | undefined;
  for (const point of points) {
    const slot = firstSlot + slotsAfter(first, point[0] * scale, stepMs);
    const moved = [(start + slot * stepMs) / scale, point[1]] as T;
    if (slot === lastSlot) {
      aligned[aligned.length - 1] = moved;
    } else {
      aligned.push(moved);
      lastSlot = slot;
    }
  }
  return aligned;
}

function byTime<T extends [number, unknown]>(points: T[]): T[] {
  for (let index = 1; index < points.length; index++) {
    if ((points[index]?.[0] ?? 0) < (points[index - 1]?.[0] ?? 0)) {
      return points.toSorted((a, b) => a[0] - b[0]);
    }
  }
  return points;
}

export interface BuildTimeSeriesOptions {
  /** Timestamp, in milliseconds, of the rows of a result without a time column. */
  instant: number;
  /** Start of the time range, in milliseconds: the time grid of the series starts at or right before it. */
  rangeStart: number;
  /** Interval of the query, in milliseconds: the step of the series whose points do not tell their interval. */
  intervalMs: number;
  seriesNameFormat?: string;
}

export interface BuiltTimeSeries {
  series: TimeSeries[];
  exemplars: TimeSeriesExemplars[];
  /** Start of the time grid of the series, in milliseconds. */
  start: number;
  stepMs: number;
  notices: Notice[];
}

/**
 * buildTimeSeries converts a result into time series.
 *
 * - The rows are grouped by the values of their label columns: there is one series per group and value column.
 * - Without label columns, a series is named after its value column. With them, it is named after its labels, and
 *   after its value column too when there are several.
 * - A result without a time column is a table: each row is a series of its own, with a single point at the end of
 *   the time range, and the series keep the order of the rows.
 */
export function buildTimeSeries(response: ClickHouseQueryResponse, options: BuildTimeSeriesOptions): BuiltTimeSeries {
  const { columns, rows } = response;
  const roles = classifyColumns(columns, response.timeZone);
  const notices: Notice[] = [];
  const isTable = roles.time === -1;
  const groups = new Map<string, SeriesGroup>();
  // Rows of a series come with the same raw label values: canonicalize the labels once per distinct combination.
  const groupsByRawLabels = new Map<string, SeriesGroup>();
  let skipped = 0;

  for (const row of rows) {
    const timestamp = isTable ? options.instant : toUnixMs(row[roles.time], roles.timeZone);
    if (Number.isNaN(timestamp)) {
      skipped++;
      continue;
    }
    const rawKey = roles.labels.length === 0 ? '' : JSON.stringify(roles.labels.map((index) => row[index]));
    // The rows of a table are all at the same time: the ones with the same labels are not points of one series.
    let group = isTable ? undefined : groupsByRawLabels.get(rawKey);
    if (!group) {
      const labels: Labels = {};
      for (const index of roles.labels) {
        addLabels(labels, columns[index]?.name ?? '', row[index]);
      }
      const key = labelsKey(labels);
      group = isTable ? undefined : groups.get(key);
      if (!group) {
        group = {
          labels,
          key,
          values: roles.values.map(() => []),
          histograms: [],
          exemplars: [],
        };
        groups.set(isTable ? String(groups.size) : key, group);
      }
      if (!isTable) groupsByRawLabels.set(rawKey, group);
    }
    for (let position = 0; position < roles.values.length; position++) {
      group.values[position]?.push([timestamp, toNumber(row[roles.values[position] ?? -1])]);
    }
    if (roles.histogram) {
      const histogram = readHistogram(row, roles.histogram);
      if (histogram) group.histograms.push([timestamp / SECOND, histogram]);
    }
    if (roles.exemplars) {
      for (const exemplar of readExemplars(row, roles.exemplars, roles.timeZone)) {
        group.exemplars.push(exemplar);
      }
    }
  }

  if (skipped > 0) {
    notices.push({
      type: 'warning',
      message: `${skipped} rows were skipped because their "${columns[roles.time]?.name}" column is not a date/time.`,
    });
  }
  if (rows.length > 0 && roles.values.length === 0 && !roles.histogram) {
    notices.push({
      type: 'warning',
      message: 'The query returns no numeric column: cast the columns to plot to a number type such as Float64.',
    });
  }

  // The series of a table keep the order of its rows, which the query chose, e.g. to list a top 10. The ones of a
  // time series result are sorted by labels: the order of their first rows changes from one refresh to the next.
  const sortedGroups = isTable
    ? [...groups.values()]
    : [...groups.values()].toSorted((a, b) => (a.key < b.key ? -1 : Number(a.key > b.key)));
  const hasLabels = roles.labels.length > 0;
  const severalValues = roles.values.length > 1;
  const series: TimeSeries[] = [];
  const exemplars: TimeSeriesExemplars[] = [];

  const addSeries = (
    group: SeriesGroup,
    valueColumn: string | undefined,
    values: TimeSeriesValueTuple[],
    histograms?: TimeSeriesHistogramTuple[],
  ): void => {
    const labels: Labels =
      valueColumn !== undefined && severalValues ? { [NAME_LABEL]: valueColumn, ...group.labels } : { ...group.labels };
    const selector = hasLabels ? formatSelector(group.labels) : '';
    const name = valueColumn !== undefined && (severalValues || !hasLabels) ? `${valueColumn}${selector}` : selector;
    const entry: TimeSeries = { name, values: byTime(values), labels };
    // A format that only reads labels the series does not have names nothing: the series keeps its name.
    const formattedName = options.seriesNameFormat ? formatSeriesName(options.seriesNameFormat, labels).trim() : '';
    if (formattedName !== '') entry.formattedName = formattedName;
    if (histograms) entry.histograms = byTime(histograms);
    series.push(entry);
    if (group.exemplars.length > 0 && series.length <= MAX_SERIES) {
      exemplars.push({
        seriesLabels: labels,
        exemplars: group.exemplars.toSorted((a, b) => a.timestamp - b.timestamp),
      });
      // The exemplars of a row belong to the first series of its group.
      group.exemplars = [];
    }
  };

  if (roles.histogram) {
    for (const group of sortedGroups) {
      if (group.histograms.length === 0) continue;
      // A histogram series plots the sum of its observations, like a native histogram of Prometheus.
      const values = group.histograms.map(([time, histogram]): TimeSeriesValueTuple => {
        const sum = Number(histogram.sum);
        return [time * SECOND, Number.isFinite(sum) ? sum : null];
      });
      addSeries(group, undefined, values, group.histograms);
    }
  } else {
    for (let position = 0; position < roles.values.length; position++) {
      const valueColumn = columns[roles.values[position] ?? -1]?.name ?? '';
      for (const group of sortedGroups) {
        const values = group.values[position] ?? [];
        if (values.some(([, value]) => value !== null)) addSeries(group, valueColumn, values);
      }
    }
  }

  if (series.length > MAX_SERIES) {
    notices.push({
      type: 'warning',
      message: `The query returns ${series.length} series: only the first ${MAX_SERIES} are shown. Drop the label columns with too many values, or cast them to a number if they are values.`,
    });
    series.length = MAX_SERIES;
  }

  let first = Infinity;
  let last = -Infinity;
  for (const { values } of series) {
    first = Math.min(first, values[0]?.[0] ?? Infinity);
    last = Math.max(last, values.at(-1)?.[0] ?? -Infinity);
  }
  // A table has a single point per series, at the end of the time range: one step spans the whole range.
  const stepMs = isTable
    ? Math.max(options.instant - options.rangeStart, 1)
    : chooseStepMs(series, first, last, options);

  // Anchor the time grid on the first point, then extend it back to the start of the time range.
  let start = options.rangeStart;
  if (Number.isFinite(first)) {
    const anchor = gridAnchor(first, stepMs);
    start = anchor - Math.max(0, Math.ceil((anchor - options.rangeStart) / stepMs)) * stepMs;
    let merged = 0;
    for (const entry of series) {
      const pointCount = entry.values.length;
      entry.values = alignToGrid(entry.values, start, stepMs);
      merged += pointCount - entry.values.length;
      if (entry.histograms) entry.histograms = alignToGrid(entry.histograms, start, stepMs, SECOND);
    }
    if (merged > 0) {
      notices.push({
        type: 'warning',
        message: `The query returns points too close to each other to be drawn: ${merged} of them are hidden by the next point of their series. Aggregate the rows over time, e.g. with GROUP BY $__timeInterval(column).`,
      });
    }
  }

  return { series, exemplars, start, stepMs, notices };
}

/**
 * buildExemplars converts the result of an exemplar query. Each row is an exemplar: its time column is its
 * timestamp and its `value` column, or else its first numeric column, is its value. The columns named like a label
 * of the series tell which series the exemplar belongs to, and the other ones are the labels of the exemplar,
 * e.g. `trace_id`.
 */
export function buildExemplars(response: ClickHouseQueryResponse, series: TimeSeries[]): TimeSeriesExemplars[] {
  const { columns, rows } = response;
  const time = findTimeColumn(columns);
  const named = findColumn(columns, ['value']);
  const value =
    named !== -1 ? named : columns.findIndex((column, index) => index !== time && isNumericType(column.type));
  if (time === -1 || value === -1) {
    throw new Error('An exemplar query must return a time column and a numeric "value" column.');
  }
  const timeZone = getTypeTimeZone(columns[time]?.type ?? '') ?? response.timeZone;

  const seriesLabelNames = new Set<string>();
  // With several value columns, the series of the same labels differ by the name of their value column.
  const firstValueColumns = new Map<string, string>();
  for (const { labels = {} } of series) {
    const { [NAME_LABEL]: valueColumn, ...others } = labels;
    for (const name of Object.keys(labels)) seriesLabelNames.add(name);
    if (valueColumn !== undefined) {
      const key = labelsKey(others);
      if (!firstValueColumns.has(key)) firstValueColumns.set(key, valueColumn);
    }
  }

  const groups = new Map<string, TimeSeriesExemplars>();
  for (const row of rows) {
    const timestamp = toUnixMs(row[time], timeZone);
    const exemplarValue = toNumber(row[value]);
    if (Number.isNaN(timestamp) || exemplarValue === null) continue;
    const labels: Labels = {};
    for (let index = 0; index < columns.length; index++) {
      if (index !== time && index !== value) addLabels(labels, columns[index]?.name ?? '', row[index]);
    }
    const seriesLabels: Labels = {};
    const exemplarLabels: Labels = {};
    for (const [name, label] of Object.entries(labels)) {
      (seriesLabelNames.has(name) ? seriesLabels : exemplarLabels)[name] = label;
    }
    const key = labelsKey(seriesLabels);
    let group = groups.get(key);
    if (!group) {
      // Exemplars that do not name a value column belong to the first one of the series with their labels.
      const valueColumn = seriesLabels[NAME_LABEL] === undefined ? firstValueColumns.get(key) : undefined;
      group = {
        seriesLabels: valueColumn === undefined ? seriesLabels : { [NAME_LABEL]: valueColumn, ...seriesLabels },
        exemplars: [],
      };
      groups.set(key, group);
    }
    group.exemplars.push({
      timestamp,
      value: exemplarValue,
      labels: exemplarLabels,
    });
  }
  for (const group of groups.values()) {
    group.exemplars.sort((a, b) => a.timestamp - b.timestamp);
  }
  return [...groups.values()];
}
