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

import { Alert, Button, Stack, TextField } from '@mui/material';
import { useDatasourceClient } from '@perses-dev/plugin-system';
import type { DatasourceSelector } from '@perses-dev/spec';
import type { ChangeEvent, ReactElement } from 'react';
import { useCallback, useState } from 'react';

import type { CloudWatchClient, CloudWatchMetricInfo, CloudWatchMetricStat, ListMetricsResponse } from '../../model';
import { CLOUDWATCH_MIN_PERIOD } from '../../model';

export function toMetricStat(metric: CloudWatchMetricInfo): CloudWatchMetricStat {
  const dimensions = Object.fromEntries(metric.Dimensions.map((dimension) => [dimension.Name, dimension.Value]));
  return {
    namespace: metric.Namespace,
    name: metric.MetricName,
    dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined,
    statistic: 'Average',
    period: CLOUDWATCH_MIN_PERIOD,
  };
}

const DISCOVERED_METRIC_SX = { justifyContent: 'flex-start', textTransform: 'none' };

function metricKey(metric: CloudWatchMetricInfo): string {
  return `${metric.Namespace}/${metric.MetricName}/${JSON.stringify(metric.Dimensions)}`;
}

interface DiscoveredMetricProps {
  metric: CloudWatchMetricInfo;
  onSelect: (metric: CloudWatchMetricStat) => void;
}

function DiscoveredMetric({ metric, onSelect }: DiscoveredMetricProps): ReactElement {
  const handleClick = useCallback(() => onSelect(toMetricStat(metric)), [metric, onSelect]);
  const dimensions = metric.Dimensions.map((dimension) => `${dimension.Name}=${dimension.Value}`).join(', ');
  return (
    <Button size="small" sx={DISCOVERED_METRIC_SX} onClick={handleClick}>
      {metric.Namespace} / {metric.MetricName}
      {dimensions && ` {${dimensions}}`}
    </Button>
  );
}

export interface MetricDiscoveryProps {
  datasource: DatasourceSelector;
  onSelect: (metric: CloudWatchMetricStat) => void;
}

/**
 * Lists the metrics of a namespace with ListMetrics, so the user can add one to the queries.
 */
export function MetricDiscovery({ datasource, onSelect }: MetricDiscoveryProps): ReactElement {
  const { data: client } = useDatasourceClient<CloudWatchClient>(datasource);
  const [namespace, setNamespace] = useState('AWS/EC2');
  const [metricName, setMetricName] = useState('');
  const [response, setResponse] = useState<ListMetricsResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleNamespaceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setNamespace(event.target.value),
    [],
  );
  const handleMetricNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setMetricName(event.target.value),
    [],
  );

  const discover = useCallback((): void => {
    if (client === undefined) {
      return;
    }
    setLoading(true);
    setError(undefined);
    setResponse(undefined);
    client.listMetrics({ namespace: namespace.trim(), metricName: metricName.trim() || undefined }).then(
      (result) => {
        setResponse(result);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : 'Metric discovery failed.');
        setLoading(false);
      },
    );
  }, [client, namespace, metricName]);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <TextField label="Namespace" size="small" value={namespace} onChange={handleNamespaceChange} />
        <TextField label="Metric name (optional)" size="small" value={metricName} onChange={handleMetricNameChange} />
        <Button
          variant="outlined"
          disabled={loading || client === undefined || namespace.trim() === ''}
          onClick={discover}
        >
          Discover metrics
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {response?.Metrics.length === 0 && (
        <Alert severity="info">
          No metric found. ListMetrics only returns the metrics with data in the last two weeks.
        </Alert>
      )}
      {response?.Truncated && (
        <Alert severity="info">
          Only the first {response.Metrics.length} metrics are listed. Enter a metric name to narrow the discovery.
        </Alert>
      )}
      {response?.Metrics.map((metric) => (
        <DiscoveredMetric key={metricKey(metric)} metric={metric} onSelect={onSelect} />
      ))}
    </Stack>
  );
}
