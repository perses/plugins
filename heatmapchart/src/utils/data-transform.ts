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

import { getCommonTimeScale } from '@perses-dev/components';
import type { PanelData } from '@perses-dev/plugin-system';
import type { Exemplar, Labels, TimeScale, TimeSeriesData, TimeSeriesExemplars } from '@perses-dev/spec';
import type { ScatterSeriesOption } from 'echarts/charts';

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

/**
 * Prefix of the ECharts series id used for the exemplar markers, so hover/pin
 * event handlers can identify them (same convention as the TimeSeriesChart).
 */
export const EXEMPLAR_SERIES_ID_PREFIX = 'exemplar-';

/** Diamond marker size, in pixels (same as the TimeSeriesChart). */
export const EXEMPLAR_SYMBOL_SIZE = 14;

export interface HeatMapExemplarDataItem {
  /**
   * The plotted point: the index in the X axis categories (nearest timestamp)
   * and the exemplar's observed value on the Y axis.
   */
  value: [number, number];
  /** The original exemplar, kept for the metadata tooltip. */
  exemplar: Exemplar;
  /** Labels of the exemplar's series (`__name__` stripped, like the TimeSeriesChart). */
  seriesLabels?: Labels;
}

/**
 * Finds the index of the category closest to `timestamp` in an ascending list of
 * timestamps. Returns -1 when the timestamp is outside the categories range.
 */
export function findNearestTimestampIndex(categories: number[], timestamp: number): number {
  if (categories.length === 0 || timestamp < (categories[0] ?? 0) || timestamp > (categories.at(-1) ?? 0)) {
    return -1;
  }
  let low = 0;
  let high = categories.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((categories[mid] ?? 0) < timestamp) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  // `low` is the first category >= timestamp: pick it or its predecessor, whichever is closer.
  const current = categories[low] ?? 0;
  if (low > 0 && Math.abs((categories[low - 1] ?? 0) - timestamp) <= Math.abs(current - timestamp)) {
    return low - 1;
  }
  return low;
}

/** Returns the labels without `__name__`. */
function withoutMetricName(labels: Labels): Labels {
  return Object.fromEntries(Object.entries(labels).filter(([labelName]) => labelName !== '__name__'));
}

/**
 * Whether an exemplar group belongs to the displayed histogram series: every label of the
 * displayed series must be present, with the same value, in the group's series labels.
 * `__name__` is ignored on both sides (Prometheus drops it from expression results).
 *
 * Prometheus fetches exemplars from the query's selectors, not from the evaluated expression,
 * so a query like `h and on(route) enabled_routes` also returns exemplars for routes the
 * histogram excludes. Requiring the displayed labels to be a subset of the group labels drops
 * those, while still keeping exemplars for aggregated histograms: `sum by (route) (rate(h[5m]))`
 * keeps the groups of its route, and `sum(rate(h[5m]))` (no labels) keeps every group.
 */
export function isExemplarGroupInSeries(groupLabels: Labels, displayedSeriesLabels: Labels): boolean {
  return Object.entries(displayedSeriesLabels).every(
    ([labelName, labelValue]) => labelName === '__name__' || groupLabels[labelName] === labelValue,
  );
}

/**
 * Converts the exemplar groups of the TimeSeriesData contract into chart-friendly
 * data items for the heatmap: one flat list, since the heatmap renders a single
 * series. Only groups belonging to the displayed histogram series are kept (see
 * `isExemplarGroupInSeries`), and exemplars outside the chart time range are dropped.
 * Without the displayed series labels, groups cannot be matched and none are kept.
 */
export function getHeatMapExemplarData(
  groups: TimeSeriesExemplars[] | undefined,
  xAxisCategories: number[],
  displayedSeriesLabels: Labels | undefined,
): HeatMapExemplarDataItem[] {
  if (!groups || xAxisCategories.length === 0 || displayedSeriesLabels === undefined) return [];
  const items: HeatMapExemplarDataItem[] = [];
  for (const group of groups) {
    if (!isExemplarGroupInSeries(group.seriesLabels, displayedSeriesLabels)) continue;
    // Prometheus includes __name__ in exemplar series labels but omits it from range-query
    // labels for expressions; strip it like the TimeSeriesChart does, so the metadata
    // tooltip shows the same series labels on both panels.
    const seriesLabels = withoutMetricName(group.seriesLabels);
    for (const exemplar of group.exemplars) {
      const xIndex = findNearestTimestampIndex(xAxisCategories, exemplar.timestamp);
      if (xIndex < 0) continue;
      items.push({
        value: [xIndex, exemplar.value],
        exemplar,
        seriesLabels,
      });
    }
  }
  return items;
}

/**
 * Gets an ECharts scatter series rendering exemplar markers as diamonds on top of
 * the heatmap. Each data item embeds its exemplar (and series labels) so the hover
 * handlers can open the metadata tooltip. Rendered white with a dark border to stay
 * visible over the heatmap gradient.
 */
export function getExemplarScatterSeries(data: HeatMapExemplarDataItem[]): ScatterSeriesOption {
  return {
    id: `${EXEMPLAR_SERIES_ID_PREFIX}heatmap`,
    name: 'Exemplars',
    type: 'scatter',
    symbol: 'diamond',
    symbolSize: EXEMPLAR_SYMBOL_SIZE,
    z: 10, // render above the heatmap custom series
    itemStyle: {
      color: '#ffffff',
      borderColor: '#000000',
      borderWidth: 1,
    },
    data,
  };
}
