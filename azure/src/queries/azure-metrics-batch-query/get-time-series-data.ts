// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { datasourceSelectValueToSelector, replaceVariables } from '@perses-dev/plugin-system';
import type { TimeSeriesQueryPlugin, VariableStateMap } from '@perses-dev/plugin-system';
import type { TimeSeriesData, TimeSeries, AbsoluteTimeRange } from '@perses-dev/spec';

import type {
  AzureRegionalMetricsDatasourceClient,
  AzureRegionalMetricsDatasourceResponse,
  AzureMetricsBatchQueryRequestOptions,
  MetadataValue,
  Metric,
  MetricValue,
  TimeSeriesElement,
  Value,
} from '../../datasources/azure-regional-metrics-datasource/azure-regional-metrics-datasource-types';
import type { AzureMetricsBatchQuerySpec } from './azure-metrics-batch-query-types';
import {
  AZURE_REGIONAL_METRICS_DATASOURCE_KIND,
  AZURE_METRICS_BATCH_DEFAULT_DATASOURCE,
  AZURE_METRICS_BATCH_DEFAULT_INTERVAL,
} from './constants';
import { parseIso8601DurationMs } from './iso8601-duration';

const aggregations = ['average', 'count', 'maximum', 'minimum', 'total'] as const satisfies ReadonlyArray<
  keyof MetricValue
>;

function buildTimeSeries(response?: AzureRegionalMetricsDatasourceResponse): TimeSeries[] {
  if (!response || response.values === undefined) {
    return [];
  }

  const timeSeriesList: TimeSeries[] = [];
  response.values.forEach((value) => {
    value.value.forEach((metric) => {
      metric.timeseries.forEach((timeSeriesElement) => {
        // Since each data point contains all the aggregations, they need to be split into individual series.
        // Metadata should become labels on the time series (if any).
        const aggregationSeriesMap: Record<(typeof aggregations)[number], TimeSeries | undefined> = {
          average: undefined,
          count: undefined,
          maximum: undefined,
          minimum: undefined,
          total: undefined,
        };
        timeSeriesElement.data.forEach((metricValue) => {
          const timestamp: number = Date.parse(metricValue.timeStamp);
          for (const aggregation of aggregations) {
            if (metricValue[aggregation] !== undefined) {
              if (aggregationSeriesMap[aggregation] === undefined) {
                aggregationSeriesMap[aggregation] = createBlankDataTimeseries(
                  value,
                  metric,
                  timeSeriesElement,
                  aggregation,
                );
              }
              aggregationSeriesMap[aggregation]!.values.push([timestamp, metricValue[aggregation]]);
            }
          }
        });
        // Add all the created time series to the main timeSeries array
        for (const aggregation of aggregations) {
          if (aggregationSeriesMap[aggregation] !== undefined) {
            timeSeriesList.push(aggregationSeriesMap[aggregation]);
          }
        }
      });
    });
  });
  return timeSeriesList;
}

function buildFlattenedTimeSeries(response?: AzureRegionalMetricsDatasourceResponse): TimeSeries[] {
  // If returning a single point per resourceId/metric/aggregation it might make more sense to flatten all
  // the metrics into a single timeseries with a single data point per resourceId which is more useful when
  // used with a table (single row). Done by creating a label for each metric/aggregation per resourceId.
  // Multiple timeseries for a single resourceId will still be returned if a single metric contains multiple
  // timeseries (due to metadata), in which case data is grouped by metadata labels.
  if (!response || response.values === undefined) {
    return [];
  }

  const timeSeriesList: TimeSeries[] = [];
  response.values.forEach((value) => {
    // Multiple time series if there is metadata.
    const resourceTimeSeriesMap: Record<string, TimeSeries> = {};
    value.value.forEach((metric) => {
      metric.timeseries.forEach((timeSeriesElement) => {
        if (timeSeriesElement.data.length !== 1) {
          throw new Error(
            `Expected exactly 1 data point per time series element during flattening but got ${timeSeriesElement.data.length}.`,
          );
        }
        const metadataKey: string = keyFromMetadata(timeSeriesElement.metadatavalues);
        if (resourceTimeSeriesMap[metadataKey] === undefined) {
          resourceTimeSeriesMap[metadataKey] = createFlattenedBlankDataTimeseries(value, timeSeriesElement);
        }
        const metricValue: MetricValue = timeSeriesElement.data[0]!;
        const timestamp: number = Date.parse(metricValue.timeStamp);
        resourceTimeSeriesMap[metadataKey].values.push([timestamp, 0]); // Dummy value since the real values are in the labels
        for (const aggregation of aggregations) {
          if (metricValue[aggregation] !== undefined) {
            const metricAggregationKey = `${metric.name.value}-${aggregation}`;
            resourceTimeSeriesMap[metadataKey].labels![metricAggregationKey] = String(metricValue[aggregation]);
          }
        }
      });
    });
    // Add all the created time series to the main timeSeries array
    for (const metadataKey in resourceTimeSeriesMap) {
      timeSeriesList.push(resourceTimeSeriesMap[metadataKey]!);
    }
  });
  return timeSeriesList;
}

export const getTimeSeriesData: TimeSeriesQueryPlugin<AzureMetricsBatchQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context,
) => {
  if (
    !spec.subscriptionId ||
    !spec.metricNames ||
    !spec.metricNamespace ||
    !spec.resourceIds ||
    spec.resourceIds.length === 0
  ) {
    return { series: [] };
  }

  const listDatasourceSelectItems = await context.datasourceStore.listDatasourceSelectItems(
    AZURE_REGIONAL_METRICS_DATASOURCE_KIND,
  );
  const datasourceSelector =
    datasourceSelectValueToSelector(spec.datasource, context.variableState, listDatasourceSelectItems) ??
    AZURE_METRICS_BATCH_DEFAULT_DATASOURCE;

  const client =
    await context.datasourceStore.getDatasourceClient<AzureRegionalMetricsDatasourceClient>(datasourceSelector);

  const preparedQuery = buildAzureMetricsBatchQuery(spec, context.variableState, context.timeRange);
  const response = await client.metricsBatchQuery(preparedQuery);

  const singlePoint = spec.singlePoint ?? false;
  const flattenMetrics = spec.flattenMetrics ?? false;
  const chartData: TimeSeriesData = {
    series: singlePoint && flattenMetrics ? buildFlattenedTimeSeries(response) : buildTimeSeries(response),
    timeRange: { start: preparedQuery.queryParameters.startTime, end: preparedQuery.queryParameters.endTime },
    // Waiting for the day where parseIso8601DurationMs can be replaced with Temporal.Duration.from()...
    stepMs: !spec.singlePoint
      ? parseIso8601DurationMs(spec.interval ?? AZURE_METRICS_BATCH_DEFAULT_INTERVAL)
      : undefined,
    metadata: {
      executedQueryString: JSON.stringify(preparedQuery),
      notices: response.warning ? [{ type: 'warning', message: response.warning }] : undefined,
    },
  };
  return chartData;
};

function buildAzureMetricsBatchQuery(
  spec: AzureMetricsBatchQuerySpec,
  variableState: VariableStateMap,
  timeRange: AbsoluteTimeRange,
): AzureMetricsBatchQueryRequestOptions {
  let interval = undefined;
  if (spec.singlePoint) {
    interval = 'FULL';
  } else if (spec.interval) {
    interval = spec.interval;
  }
  const requestOptions: AzureMetricsBatchQueryRequestOptions = {
    subscriptionId: replaceVariables(spec.subscriptionId, variableState),
    queryParameters: {
      metricNames: spec.metricNames,
      metricNamespace: spec.metricNamespace,
      aggregation: spec.aggregation ? spec.aggregation : undefined,
      endTime: timeRange.end,
      filter: spec.filter ? replaceVariables(spec.filter, variableState).replaceAll('\n', ' ') : undefined,
      interval: interval,
      orderBy: spec.orderBy ? spec.orderBy : undefined,
      rollupBy: spec.rollupBy ? spec.rollupBy : undefined,
      startTime: timeRange.start,
      top: spec.top ? Number(spec.top) : undefined,
    },
    resourceIds: spec.resourceIds.flatMap((resourceId) => convertFromCommaList(resourceId, variableState)),
  };

  return requestOptions;
}

function convertFromCommaList(value: string, variableState: VariableStateMap): string[] {
  return replaceVariables(value, variableState)
    .replaceAll('\n', '')
    .split(',')
    .map((item) => item.trim());
}

function createBlankDataTimeseries(
  value: Value,
  metric: Metric,
  timeSeriesElement: TimeSeriesElement,
  aggregationName: string,
): TimeSeries {
  const timeSeries: TimeSeries = {
    name: metric.id + ' - ' + aggregationName,
    values: [],
  };

  const metadataLabels = timeSeriesElement.metadatavalues.reduce(
    (labels: Record<string, string>, metadata: MetadataValue) => {
      labels[metadata.name.value] = metadata.value;
      return labels;
    },
    {},
  );
  const labels = { ...metadataLabels, resourceId: value.resourceid, metricName: metric.name.value, aggregationName };
  timeSeries.labels = labels;

  return timeSeries;
}

function createFlattenedBlankDataTimeseries(value: Value, timeSeriesElement: TimeSeriesElement): TimeSeries {
  const timeSeries: TimeSeries = {
    name: value.resourceid,
    values: [],
  };

  const metadataLabels = timeSeriesElement.metadatavalues.reduce(
    (labels: Record<string, string>, metadata: MetadataValue) => {
      labels[metadata.name.value] = metadata.value;
      return labels;
    },
    {},
  );
  const labels = { ...metadataLabels, resourceId: value.resourceid };
  timeSeries.labels = labels;

  return timeSeries;
}

function keyFromMetadata(metadataValues: MetadataValue[]): string {
  return metadataValues.map((metadata) => `${metadata.name.value}:${metadata.value}`).join(',');
}
