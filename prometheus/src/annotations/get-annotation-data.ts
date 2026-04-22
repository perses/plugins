import { AnnotationData } from '@perses-dev/spec';
import { AnnotationContext, datasourceSelectValueToSelector, replaceVariables } from '@perses-dev/plugin-system';
import { DatasourceSpec, parseDurationString } from '@perses-dev/core';
import { milliseconds } from 'date-fns';
import { DEFAULT_SCRAPE_INTERVAL, PrometheusDatasourceSpec, PrometheusPromQLAnnotationOptions } from '../plugins';
import { DEFAULT_PROM, getPrometheusTimeRange, getRangeStep, PROM_DATASOURCE_KIND, PrometheusClient } from '../model';

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
    undefined,
    abortSignal
  );

  const result: AnnotationData[] = [];
  for (const series of data?.result ?? []) {
    const start = series.values[0]?.[0];
    const end = series.values[series.values.length - 1]?.[0];

    if (start !== undefined && end !== undefined) {
      result.push({
        start: start,
        end: end,
        title: 'TODO title',
        legend: 'TODO legend',
        tags: { todo: 'tags' },
      });
    }
  }

  return result;
};
