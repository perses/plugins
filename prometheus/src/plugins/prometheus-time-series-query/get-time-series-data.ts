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

import {
  DatasourceSpec,
  DurationString,
  Notice,
  parseDurationString,
  TimeSeries,
  TimeSeriesData,
} from '@perses-dev/core';
import { TimeSeriesQueryPlugin, datasourceSelectValueToSelector, replaceVariables } from '@perses-dev/plugin-system';
import { fromUnixTime, milliseconds } from 'date-fns';
import {
  parseValueTuple,
  PrometheusClient,
  getDurationStringSeconds,
  getPrometheusTimeRange,
  getRangeStep,
  DEFAULT_PROM,
  MatrixData,
  VectorData,
  ScalarData,
  InstantQueryResultType,
  PROM_DATASOURCE_KIND,
} from '../../model';
import { getFormattedPrometheusSeriesName } from '../../utils';
import { DEFAULT_SCRAPE_INTERVAL, PrometheusDatasourceSpec } from '../types';
import { PrometheusTimeSeriesQuerySpec } from './time-series-query-model';
import { replacePromBuiltinVariables } from './replace-prom-builtin-variables';

export const getTimeSeriesData: TimeSeriesQueryPlugin<PrometheusTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context
) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    // Do not make a request to the backend, instead return an empty TimeSeriesData
    return { series: [] };
  }

  const listDatasourceSelectItems = await context.datasourceStore.listDatasourceSelectItems(PROM_DATASOURCE_KIND);

  const selectedDatasource =
    datasourceSelectValueToSelector(
      spec.datasource ?? DEFAULT_PROM,
      context.variableState,
      listDatasourceSelectItems
    ) ?? DEFAULT_PROM;

  const datasource = (await context.datasourceStore.getDatasource(
    selectedDatasource
  )) as DatasourceSpec<PrometheusDatasourceSpec>;
  const datasourceScrapeInterval = Math.trunc(
    milliseconds(parseDurationString(datasource.plugin.spec.scrapeInterval ?? DEFAULT_SCRAPE_INTERVAL)) / 1000
  );

  // Min step is the lower bound of the interval between data points
  // If no value is provided for it, it should default to the scrape interval of the datasource
  const minStep =
    getDurationStringSeconds(
      // resolve any variable that may have been provided
      // TODO add a validation check to make sure the variable is a DurationString, to avoid the back & forth cast here
      replaceVariables(spec.minStep as string, context.variableState) as DurationString
    ) ?? datasourceScrapeInterval;
  const timeRange = getPrometheusTimeRange(context.timeRange);
  const step = getRangeStep(timeRange, minStep, undefined, context.suggestedStepMs); // TODO: resolution

  // Align the time range so that it's a multiple of the step
  let { start, end } = timeRange;

  const utcOffsetSec = new Date().getTimezoneOffset() * 60;

  const alignedEnd = Math.floor((end + utcOffsetSec) / step) * step - utcOffsetSec;
  const alignedStart = Math.floor((start + utcOffsetSec) / step) * step - utcOffsetSec;
  start = alignedStart;
  end = alignedEnd;

  /* Ensure end is always greater than start:
     If the step is greater than equal to the diff of end and start,
     both start, and end will eventually be rounded to the same value,
     Consequently, the time range will be zero, which does not return any valid value
  */
  if (end === start) {
    end = start + step;
    console.warn(`Step (${step}) was larger than the time range! end of time range was set accordingly.`);
  }

  // Replace variable placeholders in PromQL query
  const intervalMs = step * 1000;
  const minStepMs = minStep * 1000;
  let query = replacePromBuiltinVariables(spec.query, minStepMs, intervalMs);
  query = replaceVariables(query, context.variableState);

  let seriesNameFormat = spec.seriesNameFormat;
  // if series name format is defined, replace variable placeholders in series name format
  if (seriesNameFormat) {
    seriesNameFormat = replaceVariables(seriesNameFormat, context.variableState);
  }

  // Get the datasource, using the default Prom Datasource if one isn't specified in the query
  const client: PrometheusClient = await context.datasourceStore.getDatasourceClient(selectedDatasource);

  // Make the request to Prom
  let response;
  switch (context.mode) {
    case 'instant':
      response = await client.instantQuery({
        query,
        time: end,
      });
      break;
    case 'range':
    default:
      response = await client.rangeQuery({
        query,
        start,
        end,
        step,
      });
      break;
  }

  // TODO: What about error responses from Prom that have a response body?
  const result = response.data;

  // Custom display for response header warnings, configurable error responses display coming next
  const notices: Notice[] = [];
  if (response.status === 'success') {
    const warnings = response.warnings ?? [];
    const warningMessage = warnings[0] ?? '';
    if (warningMessage !== '') {
      notices.push({
        type: 'warning',
        message: warningMessage,
      });
    }
  }

  // Transform response
  const chartData: TimeSeriesData = {
    // Return the time range and step we actually used for the query
    timeRange: { start: fromUnixTime(start), end: fromUnixTime(end) },
    stepMs: step * 1000,

    series: buildTimeSeries(query, result, seriesNameFormat),
    metadata: {
      notices,
      executedQueryString: query,
    },
  };

  return chartData;
};

function buildVectorData(query: string, data: VectorData, seriesNameFormat: string | undefined): TimeSeries[] {
  return data.result.map((res) => {
    const { metric, value, histogram } = res;

    // Account for seriesNameFormat from query editor when determining name to show in legend, tooltip, etc.
    const { name, formattedName } = getFormattedPrometheusSeriesName(query, metric, seriesNameFormat);

    if (histogram) {
      return {
        name,
        formattedName,
        labels: metric,
        values: [parseValueTuple([histogram[0], histogram[1].sum])],
        histograms: [histogram],
      };
    }

    return {
      name,
      formattedName,
      labels: metric,
      values: [parseValueTuple(value)],
    };
  });
}

function buildMatrixData(query: string, data: MatrixData, seriesNameFormat: string | undefined): TimeSeries[] {
  return data.result.map((res) => {
    const { metric, values, histograms } = res;

    // Account for seriesNameFormat from query editor when determining name to show in legend, tooltip, etc.
    const { name, formattedName } = getFormattedPrometheusSeriesName(query, metric, seriesNameFormat);

    if (histograms) {
      return {
        name,
        formattedName,
        labels: metric,
        values: histograms.map((histogram) => parseValueTuple([histogram[0], histogram[1].sum])),
        histograms: histograms.map((histogram) => histogram),
      };
    }

    return {
      name,
      formattedName,
      labels: metric,
      values: values.map(parseValueTuple),
    };
  });
}

function buildScalarData(query: string, data: ScalarData, seriesNameFormat: string | undefined): TimeSeries[] {
  const { name, formattedName } = getFormattedPrometheusSeriesName(query, {}, seriesNameFormat);
  return [
    {
      name,
      values: [parseValueTuple(data.result)],
      formattedName,
    },
  ];
}

function buildTimeSeries(query: string, data?: InstantQueryResultType, seriesNameFormat?: string): TimeSeries[] {
  if (!data) {
    return [];
  }

  const resultType = data.resultType;
  switch (resultType) {
    case 'vector':
      return buildVectorData(query, data, seriesNameFormat);
    case 'matrix':
      return buildMatrixData(query, data, seriesNameFormat);
    case 'scalar':
      return buildScalarData(query, data, seriesNameFormat);
    default:
      console.warn('Unknown result type', resultType, data);
      return [];
  }
}
