import { getCommonTimeScale, TimeScale, TimeSeriesData } from '@perses-dev/core';
import { PanelData } from '@perses-dev/plugin-system';

export function getCommonTimeScaleForQueries(queries: Array<PanelData<TimeSeriesData>>): TimeScale | undefined {
  const seriesData = queries.map((query) => query.data);
  return getCommonTimeScale(seriesData);
}

export function generateCompleteTimestamps(timescale?: TimeScale): number[] {
  if (!timescale) {
    return [];
  }
  const { startMs, endMs, stepMs } = timescale;
  const timestamps: number[] = [];
  for (let time = startMs; time <= endMs; time += stepMs) {
    timestamps.push(time);
  }
  return timestamps;
}
