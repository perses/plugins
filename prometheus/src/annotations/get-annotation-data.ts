// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { AnnotationData, DatasourceSpec, parseDurationString } from '@perses-dev/spec';
import { AnnotationContext, datasourceSelectValueToSelector, replaceVariables } from '@perses-dev/plugin-system';
import { milliseconds } from 'date-fns';
import { DEFAULT_SCRAPE_INTERVAL, PrometheusDatasourceSpec, PrometheusPromQLAnnotationOptions } from '../plugins';
import { DEFAULT_PROM, getPrometheusTimeRange, getRangeStep, PROM_DATASOURCE_KIND, PrometheusClient } from '../model';
import { formatSeriesName } from '../utils';
import { interpolateDatasourceProxyParams } from '../plugins/interpolation';

export const getAnnotationData = async (
  spec: PrometheusPromQLAnnotationOptions,
  context: AnnotationContext,
  abortSignal?: AbortSignal
): Promise<AnnotationData[]> => {
  if (!spec.expr) {
    return [];
  }

  const listDatasourceSelectItems = await context.datasourceStore.listDatasourceSelectItems(PROM_DATASOURCE_KIND);

  const datasourceSelector =
    datasourceSelectValueToSelector(
      spec.datasource ?? DEFAULT_PROM,
      context.variableState,
      listDatasourceSelectItems
    ) ?? DEFAULT_PROM;

  const client: PrometheusClient = await context.datasourceStore.getDatasourceClient(datasourceSelector);

  const datasource = (await context.datasourceStore.getDatasource(
    datasourceSelector
  )) as DatasourceSpec<PrometheusDatasourceSpec>;
  const interpolatedOptions = interpolateDatasourceProxyParams(datasource, context.variableState);

  const datasourceScrapeInterval = Math.trunc(
    milliseconds(parseDurationString(datasource.plugin.spec.scrapeInterval ?? DEFAULT_SCRAPE_INTERVAL)) / 1000
  );

  const timeRange = getPrometheusTimeRange(context.absoluteTimeRange);

  const step = getRangeStep(timeRange, datasourceScrapeInterval);

  const utcOffsetSec = new Date().getTimezoneOffset() * 60;

  const alignedStart = Math.floor((timeRange.start + utcOffsetSec) / step) * step - utcOffsetSec;
  let alignedEnd = Math.floor((timeRange.end + utcOffsetSec) / step) * step - utcOffsetSec;

  /* Ensure end is always greater than start:
     If the step is greater than equal to the diff of end and start,
     both start, and end will eventually be rounded to the same value,
     Consequently, the time range will be zero, which does not return any valid value
  */
  if (alignedStart === alignedEnd) {
    alignedEnd = alignedStart + step;
    console.warn(`Step (${step}) was larger than the time range! end of time range was set accordingly.`);
  }

  const { data } = await client.rangeQuery(
    {
      query: replaceVariables(spec.expr, context.variableState),
      start: alignedStart,
      end: alignedEnd,
      step: step,
    },
    { ...interpolatedOptions, signal: abortSignal }
  );

  const result: AnnotationData[] = [];
  for (const series of data?.result ?? []) {
    const start = series.values[0]?.[0];
    const end = series.values[series.values.length - 1]?.[0];

    if (start !== undefined && end !== undefined) {
      const labels = series.metric ?? {};
      const title = spec.title ? formatSeriesName(spec.title, labels) : undefined;
      const legend = spec.legend ? formatSeriesName(spec.legend, labels) : undefined;
      // If spec.tags is provided, only expose the selected label names as tags.
      // Otherwise, expose all labels.
      const tags =
        spec.tags && spec.tags.length > 0
          ? spec.tags.reduce<Record<string, string>>((acc, name) => {
              const v = labels[name];
              if (v !== undefined) acc[name] = v;
              return acc;
            }, {})
          : labels;
      result.push({
        start: start * 1000,
        end: end * 1000,
        title: title,
        legend: legend,
        tags: tags,
      });
    }
  }

  return result;
};
