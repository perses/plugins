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

import { TraceSearchResult } from '@perses-dev/spec';

/* shortened */
const trunc = Math.trunc;
const ciel = Math.ceil;
const max = Math.max;
const min = Math.min;

export type TraceHeatMapTimeBucket = Array<{ label: string; startTimestamp: number }>;

export type Scale = 'yearly' | 'monthly' | 'weekly' | 'daily' | 'hourly' | 'minutes' | 'seconds';

export type TraceHeatMapTimeScale = {
  scale: Scale;
  getBuckets: (start: number, end: number, local?: string) => TraceHeatMapTimeBucket;
};

export const TIME_IN_MS = {
  get second(): number {
    return 1000;
  },
  get minute(): number {
    return 60 * this.second;
  },
  get hour(): number {
    return 60 * this.minute;
  },
  get day(): number {
    return 24 * this.hour;
  },
  get week(): number {
    return 7 * this.day;
  },
  get month(): number {
    /**
     * A month may include 28 to 31 days.
     * To ease the scaling process and generate buckets, we keep the maximum which is 31 days.
     * Therefore, months with less than 31 days simply fall under the weekly scaling and produce weekly buckets
     */
    return 31 * this.day;
  },
  get year(): number {
    /**
     * Any value greater than equal the year definition is scaled yearly.
     * This includes the leap years which have 366 days.
     */
    return 365 * this.day;
  },
};

export const findScale = (start: number, end: number): Scale | undefined => {
  let scale: Scale | undefined = undefined;
  const diff = end - start;

  if (diff <= 0) return undefined;

  if (diff >= TIME_IN_MS.year) {
    scale = 'yearly';
  } else if (diff >= TIME_IN_MS.month) {
    scale = 'monthly';
  } else if (diff >= TIME_IN_MS.week) {
    scale = 'weekly';
  } else if (diff >= TIME_IN_MS.day) {
    scale = 'daily';
  } else if (diff >= TIME_IN_MS.hour) {
    scale = 'hourly';
  } else if (diff >= TIME_IN_MS.minute) {
    scale = 'minutes';
  } else if (diff > 0) {
    scale = 'seconds';
  }
  return scale;
};

type LabelGenerator = ((ts: number, local?: string) => string) | ((ts: number, local?: string) => () => string);

const produceBuckets = (
  scale: keyof typeof TIME_IN_MS,
  labelGenerator: LabelGenerator,
  start: number,
  end: number,
  local?: string
): TraceHeatMapTimeBucket => {
  const diff = trunc(end) - trunc(start);
  const bucketCounts = ciel(diff / TIME_IN_MS[scale]);
  const firstLabel = labelGenerator(start, local);

  const buckets: TraceHeatMapTimeBucket = [
    { startTimestamp: start, label: typeof firstLabel === 'function' ? firstLabel() : firstLabel },
  ];

  for (let i = 1; i < bucketCounts; i += 1) {
    const lastItem = buckets[buckets.length - 1];
    if (!lastItem) break;
    const nextStartTimeStamp = lastItem.startTimestamp + TIME_IN_MS[scale];
    const lbl = labelGenerator(nextStartTimeStamp, local);
    buckets.push({ startTimestamp: nextStartTimeStamp, label: typeof lbl === 'function' ? lbl() : lbl });
  }

  return buckets;
};

export const MILLISECONDS_TIME_SCALE: TraceHeatMapTimeScale[] = [
  {
    scale: 'yearly',
    getBuckets: (start: number, end: number, local?: string): TraceHeatMapTimeBucket => {
      const generateYearlyLabel = (ts: number): string => {
        const begin = new Date(ts).toISOString().split('T')[0]?.split('-')[0] ?? '';
        const end = Number(begin) + 1;
        return `${begin}-${end}`;
      };
      return produceBuckets('year', generateYearlyLabel, start, end, local);
    },
  },
  {
    scale: 'monthly',
    getBuckets: (start: number, end: number, local?: string): TraceHeatMapTimeBucket => {
      /* optimized using a js closure to avoid creating Intl.DateTimeFormat in every iteration */
      const generateMonthlyLabel = (ts: number) => {
        const formatter = new Intl.DateTimeFormat(local, { month: 'long' });
        return (): string => {
          return formatter.format(ts);
        };
      };
      return produceBuckets('month', generateMonthlyLabel, start, end, local);
    },
  },
  {
    scale: 'weekly',
    getBuckets: (start: number, end: number, local?: string): TraceHeatMapTimeBucket => {
      /* optimized using a js closure to avoid creating Intl.DateTimeFormat in every iteration */
      const generateWeeklyLabel = (ts: number) => {
        const formatter = new Intl.DateTimeFormat(local, { day: 'numeric', month: 'long' });
        return (): string => {
          return `${formatter.format(ts)} - ${formatter.format(ts + TIME_IN_MS.week)}`;
        };
      };
      return produceBuckets('week', generateWeeklyLabel, start, end, local);
    },
  },
  {
    scale: 'daily',
    getBuckets: (start: number, end: number, local?: string): TraceHeatMapTimeBucket => {
      const generateDailyLabels = (ts: number) => {
        const formatter = new Intl.DateTimeFormat(local, { weekday: 'long' });
        return (): string => {
          return formatter.format(ts);
        };
      };
      return produceBuckets('day', generateDailyLabels, start, end, local);
    },
  },
  {
    scale: 'hourly',
    getBuckets: (start: number, end: number, local?: string): TraceHeatMapTimeBucket => {
      const generateHourlyLabels = (ts: number) => {
        const formatter = new Intl.DateTimeFormat(local, { hour: 'numeric' });
        return (): string => {
          return `${formatter.format(ts)} - ${formatter.format(ts + TIME_IN_MS.hour)}`;
        };
      };

      return produceBuckets('hour', generateHourlyLabels, start, end, local);
    },
  },
  {
    scale: 'minutes',
    getBuckets: (start: number, end: number, local?: string): TraceHeatMapTimeBucket => {
      const generateMinuteLabels = (ts: number) => {
        const formatter = new Intl.DateTimeFormat(local, { hour: 'numeric', minute: 'numeric', hour12: false });
        return (): string => {
          return `${formatter.format(ts)}-${formatter.format(ts + TIME_IN_MS.minute)}`;
        };
      };
      return produceBuckets('minute', generateMinuteLabels, start, end, local);
    },
  },
  {
    scale: 'seconds',
    getBuckets: (start: number, end: number, local?: string): TraceHeatMapTimeBucket => {
      const generateSecondsLabels = (ts: number) => {
        const formatter = new Intl.DateTimeFormat(local, { second: '2-digit' });
        return (): string => {
          return `${formatter.format(ts)}-${formatter.format(ts + TIME_IN_MS.second)}`;
        };
      };
      return produceBuckets('second', generateSecondsLabels, start, end, local);
    },
  },
];

export const getTimeBuckets = (
  resultsStartTimes: Array<Pick<TraceSearchResult, 'startTimeUnixMs' | 'durationMs'>>,
  local?: string
): TraceHeatMapTimeBucket => {
  let minStartTime = Infinity;
  let maxEndTime = -Infinity;

  for (const result of resultsStartTimes) {
    minStartTime = min(minStartTime, result.startTimeUnixMs);
    maxEndTime = max(maxEndTime, trunc(result.startTimeUnixMs + result.durationMs));
  }

  if ([minStartTime, maxEndTime].some((t) => !Number.isFinite(t))) {
    return [];
  }

  const scale = findScale(minStartTime, maxEndTime);
  if (!scale) {
    return [];
  }
  const { getBuckets } = MILLISECONDS_TIME_SCALE.find((mts) => mts.scale === scale) || {};
  if (!getBuckets) {
    return [];
  }
  return getBuckets(minStartTime, maxEndTime, local ?? 'en-US');
};
