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

import { Alert, Button, Divider, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect, isVariableDatasource } from '@perses-dev/plugin-system';
import type { ChangeEvent, FocusEvent, ReactElement } from 'react';
import { useCallback, useMemo } from 'react';

import { DimensionsEditor } from '../../components/DimensionsEditor';
import type { CloudWatchDimensions, CloudWatchMetricDataQuery, CloudWatchMetricStat } from '../../model';
import {
  CLOUDWATCH_DATASOURCE_KIND,
  CLOUDWATCH_MAX_PERIOD,
  CLOUDWATCH_MAX_QUERIES,
  CLOUDWATCH_MIN_PERIOD,
  DEFAULT_CLOUDWATCH,
} from '../../model';
import type { CloudWatchTimeSeriesQuerySpec } from './cloudwatch-time-series-query-types';
import { MetricDiscovery } from './MetricDiscovery';

const ID_REGEXP = /^[a-z][a-zA-Z0-9_]{0,63}$/;
const STATISTIC_REGEXP = /^(Average|Sum|Minimum|Maximum|SampleCount|p([0-9]|[1-9][0-9])(\.[0-9]{1,2})?|p100)$/;

/**
 * Returns the first problem of the queries, or undefined when they are valid.
 */
export function validateQueries(queries: CloudWatchMetricDataQuery[]): string | undefined {
  if (queries.length === 0 || queries.length > CLOUDWATCH_MAX_QUERIES) {
    return `Define between 1 and ${CLOUDWATCH_MAX_QUERIES} queries.`;
  }
  const ids = new Set<string>();
  for (const query of queries) {
    if (!ID_REGEXP.test(query.id) || ids.has(query.id)) {
      return `Query ID "${query.id}" must be unique, start with a lower-case letter and contain only letters, digits and underscores.`;
    }
    ids.add(query.id);
    if ((query.metric === undefined) === (query.expression === undefined)) {
      return `Query "${query.id}" must define either a metric or an expression.`;
    }
    const metric = query.metric;
    if (metric !== undefined) {
      if (metric.namespace === '' || metric.name === '') {
        return `Query "${query.id}" needs a namespace and a metric name.`;
      }
      if (!STATISTIC_REGEXP.test(metric.statistic)) {
        return `Query "${query.id}" has an unsupported statistic.`;
      }
      if (
        !Number.isInteger(metric.period) ||
        metric.period < CLOUDWATCH_MIN_PERIOD ||
        metric.period > CLOUDWATCH_MAX_PERIOD ||
        metric.period % CLOUDWATCH_MIN_PERIOD !== 0
      ) {
        return `The period of query "${query.id}" must be a multiple of 60 between 60 and 86400 seconds.`;
      }
    } else if (query.expression === '') {
      return `Query "${query.id}" needs an expression.`;
    }
  }
  if (queries.every((query) => query.returnData === false)) {
    return 'At least one query must return data.';
  }
  return undefined;
}

function nextID(queries: CloudWatchMetricDataQuery[], prefix: string): string {
  let index = 1;
  while (queries.some((query) => query.id === `${prefix}${index}`)) {
    index++;
  }
  return `${prefix}${index}`;
}

export function newMetricQuery(id: string, metric?: CloudWatchMetricStat): CloudWatchMetricDataQuery {
  return {
    id,
    metric: metric ?? {
      namespace: 'AWS/EC2',
      name: 'CPUUtilization',
      statistic: 'Average',
      period: CLOUDWATCH_MIN_PERIOD,
    },
  };
}

type MetricField = 'namespace' | 'name' | 'statistic';

interface QueryEditorProps {
  query: CloudWatchMetricDataQuery;
  isReadonly?: boolean;
  onChange: (id: string, query: CloudWatchMetricDataQuery) => void;
  onRemove: (id: string) => void;
}

function QueryEditor({ query, isReadonly, onChange, onRemove }: QueryEditorProps): ReactElement {
  const readOnlyProps = useMemo(() => ({ input: { readOnly: isReadonly } }), [isReadonly]);

  // The ID is applied on blur, so a partial ID doesn't rename the query (and its React key) at each keystroke.
  const handleIdBlur = useCallback(
    (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
      onChange(query.id, { ...query, id: event.target.value.trim() }),
    [onChange, query],
  );
  const handleLabelChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(query.id, { ...query, label: event.target.value || undefined }),
    [onChange, query],
  );
  const handleExpressionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => onChange(query.id, { ...query, expression: event.target.value }),
    [onChange, query],
  );
  const handleMetricChange = useCallback(
    (field: MetricField) =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        if (query.metric) {
          onChange(query.id, { ...query, metric: { ...query.metric, [field]: event.target.value } });
        }
      },
    [onChange, query],
  );
  const handlePeriodChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      if (query.metric) {
        onChange(query.id, { ...query, metric: { ...query.metric, period: Number(event.target.value) } });
      }
    },
    [onChange, query],
  );
  const handleDimensionsChange = useCallback(
    (dimensions?: CloudWatchDimensions): void => {
      if (query.metric) {
        onChange(query.id, { ...query, metric: { ...query.metric, dimensions } });
      }
    },
    [onChange, query],
  );
  const handleReturnDataChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(query.id, { ...query, returnData: event.target.checked ? undefined : false }),
    [onChange, query],
  );
  const handleRemove = useCallback(() => onRemove(query.id), [onRemove, query.id]);

  const returnDataSwitch = useMemo(
    () => <Switch checked={query.returnData !== false} disabled={isReadonly} onChange={handleReturnDataChange} />,
    [query.returnData, isReadonly, handleReturnDataChange],
  );

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1}>
        <TextField
          label="ID"
          size="small"
          defaultValue={query.id}
          slotProps={readOnlyProps}
          helperText="Referenced by the expressions."
          onBlur={handleIdBlur}
        />
        <TextField
          label="Legend"
          size="small"
          fullWidth
          value={query.label ?? ''}
          slotProps={readOnlyProps}
          onChange={handleLabelChange}
        />
      </Stack>
      {query.metric ? (
        <>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Namespace"
              size="small"
              fullWidth
              value={query.metric.namespace}
              slotProps={readOnlyProps}
              onChange={handleMetricChange('namespace')}
            />
            <TextField
              label="Metric name"
              size="small"
              fullWidth
              value={query.metric.name}
              slotProps={readOnlyProps}
              onChange={handleMetricChange('name')}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Statistic"
              size="small"
              value={query.metric.statistic}
              slotProps={readOnlyProps}
              helperText="Average, Sum, Minimum, Maximum, SampleCount or a percentile like p99."
              onChange={handleMetricChange('statistic')}
            />
            <TextField
              label="Minimum period (seconds)"
              size="small"
              type="number"
              value={query.metric.period}
              slotProps={readOnlyProps}
              helperText="Increased automatically for long time ranges."
              onChange={handlePeriodChange}
            />
          </Stack>
          <DimensionsEditor
            label="Dimensions"
            value={query.metric.dimensions}
            readOnly={isReadonly}
            onChange={handleDimensionsChange}
          />
        </>
      ) : (
        <TextField
          label="Metric math expression"
          size="small"
          fullWidth
          value={query.expression ?? ''}
          slotProps={readOnlyProps}
          helperText="Reference the other queries by ID, for example m1 / m2 * 100."
          onChange={handleExpressionChange}
        />
      )}
      <Stack direction="row" justifyContent="space-between">
        <FormControlLabel label="Show this series" control={returnDataSwitch} />
        {!isReadonly && (
          <Button color="error" onClick={handleRemove}>
            Remove {query.id}
          </Button>
        )}
      </Stack>
      <Divider />
    </Stack>
  );
}

export function CloudWatchTimeSeriesQueryEditor({
  value,
  onChange,
  isReadonly,
}: OptionsEditorProps<CloudWatchTimeSeriesQuerySpec>): ReactElement {
  const datasource = value.datasource ?? DEFAULT_CLOUDWATCH;
  const error = useMemo(() => validateQueries(value.queries), [value.queries]);
  const canAdd = !isReadonly && value.queries.length < CLOUDWATCH_MAX_QUERIES;

  const handleDatasourceChange = useCallback<DatasourceSelectProps['onChange']>(
    (next) => {
      if (!isVariableDatasource(next) && next.kind === CLOUDWATCH_DATASOURCE_KIND) {
        onChange({ ...value, datasource: next });
      }
    },
    [onChange, value],
  );
  const handleQueryChange = useCallback(
    (id: string, updated: CloudWatchMetricDataQuery): void =>
      onChange({ ...value, queries: value.queries.map((query) => (query.id === id ? updated : query)) }),
    [onChange, value],
  );
  const handleQueryRemove = useCallback(
    (id: string): void => onChange({ ...value, queries: value.queries.filter((query) => query.id !== id) }),
    [onChange, value],
  );
  const handleMetricSelect = useCallback(
    (metric: CloudWatchMetricStat): void =>
      onChange({ ...value, queries: [...value.queries, newMetricQuery(nextID(value.queries, 'm'), metric)] }),
    [onChange, value],
  );
  const handleAddMetric = useCallback(
    (): void => onChange({ ...value, queries: [...value.queries, newMetricQuery(nextID(value.queries, 'm'))] }),
    [onChange, value],
  );
  const handleAddExpression = useCallback(
    (): void => onChange({ ...value, queries: [...value.queries, { id: nextID(value.queries, 'e'), expression: '' }] }),
    [onChange, value],
  );

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind={CLOUDWATCH_DATASOURCE_KIND}
        value={datasource}
        label="CloudWatch Datasource"
        readOnly={isReadonly}
        onChange={handleDatasourceChange}
      />
      {canAdd && <MetricDiscovery datasource={datasource} onSelect={handleMetricSelect} />}
      {error && <Alert severity="warning">{error}</Alert>}
      {value.queries.map((query) => (
        <QueryEditor
          key={query.id}
          query={query}
          isReadonly={isReadonly}
          onChange={handleQueryChange}
          onRemove={handleQueryRemove}
        />
      ))}
      {canAdd && (
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleAddMetric}>
            Add metric
          </Button>
          <Button variant="outlined" onClick={handleAddExpression}>
            Add expression
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
