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

import { Autocomplete, Checkbox, FormControlLabel, IconButton, Stack, TextField } from '@mui/material';
import { InfoTooltip } from '@perses-dev/components';
import { DatasourceSelect } from '@perses-dev/plugin-system';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import InformationOutlineIcon from 'mdi-material-ui/InformationOutline';
import type { ReactElement } from 'react';
import { useState } from 'react';

import {
  isAzureRegionalMetricsDatasourceSelector,
  isDefaultAzureRegionalMetricsDatasourceSelector,
} from '../../datasources/';
import { parseNumber } from '../../utils';
import type { AzureMetricsBatchQuerySpec } from './azure-metrics-batch-query-types';
import { AGGREGATION_TYPES, DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';

type AzureMetricsBatchQueryEditorProps = OptionsEditorProps<AzureMetricsBatchQuerySpec>;

type RequiredStringField = 'subscriptionId' | 'metricNamespace';
type OptionalStringField = 'filter' | 'interval' | 'orderBy' | 'rollupBy';
type OptionalNumberField = 'top'; // stored locally as strings and converted to numbers on commit
type OptionalBooleanField = 'singlePoint' | 'flattenMetrics';

interface LocalFieldState
  extends Record<RequiredStringField | OptionalStringField, string>, Record<OptionalNumberField, string> {}

function toLocalFieldState(spec: AzureMetricsBatchQuerySpec): LocalFieldState {
  return {
    subscriptionId: spec.subscriptionId,
    metricNamespace: spec.metricNamespace,
    filter: spec.filter ?? '',
    interval: spec.interval ?? '',
    orderBy: spec.orderBy ?? '',
    rollupBy: spec.rollupBy ?? '',
    top: spec.top?.toString() ?? '',
  };
}

export function AzureMetricsBatchQueryEditor(props: AzureMetricsBatchQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_DATASOURCE;
  const singlePoint = value.singlePoint ?? false;
  const [prevValue, setPrevValue] = useState(value);
  const [localFields, setLocalFields] = useState(() => toLocalFieldState(value));
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalFields(toLocalFieldState(value));
  }

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (isAzureRegionalMetricsDatasourceSelector(newDatasourceSelection)) {
      onChange({
        ...value,
        datasource: isDefaultAzureRegionalMetricsDatasourceSelector(newDatasourceSelection)
          ? undefined
          : newDatasourceSelection,
      });
      return;
    }

    throw new Error('Got unexpected non AzureRegionalMetrics datasource selection');
  };

  const handleFieldChange =
    (field: keyof LocalFieldState) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setLocalFields({ ...localFields, [field]: event.target.value });
    };

  const handleCheckboxChange =
    (field: OptionalBooleanField) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...value, [field]: event.target.checked });
    };

  const commitRequiredStringField = (field: RequiredStringField) => (): void => {
    const newValue = localFields[field];
    if (newValue !== value[field]) {
      onChange({ ...value, [field]: newValue });
    }
  };

  const commitOptionalStringField = (field: OptionalStringField) => (): void => {
    const newValue = localFields[field] || undefined;
    if (newValue !== value[field]) {
      onChange({ ...value, [field]: newValue });
    }
  };

  const commitOptionalNumberField = (field: OptionalNumberField) => (): void => {
    const newValue = parseNumber(localFields[field]);
    if (newValue !== value[field]) {
      onChange({ ...value, [field]: newValue });
    }
  };

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="AzureMetricsBatchQuery Datasource"
        notched
      />
      <TextField
        fullWidth
        required
        size="small"
        label="Subscription ID"
        placeholder="e.g. 00000000-0000-0000-0000-000000000000"
        value={localFields.subscriptionId}
        onChange={handleFieldChange('subscriptionId')}
        onBlur={commitRequiredStringField('subscriptionId')}
      />
      <Autocomplete
        multiple
        freeSolo
        disableCloseOnSelect
        options={[]}
        value={value.resourceIds}
        onChange={(event, newValue): void => {
          onChange({ ...value, resourceIds: newValue });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            required
            label="Resource IDs"
            size="small"
            placeholder="e.g. ${variable:csv} OR /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-resource-group/providers/resource-provider/resource-type/resource-name"
          />
        )}
      />
      <TextField
        fullWidth
        required
        size="small"
        label="Metric Namespace"
        placeholder="e.g. microsoft.compute/virtualmachines"
        value={localFields.metricNamespace}
        onChange={handleFieldChange('metricNamespace')}
        onBlur={commitRequiredStringField('metricNamespace')}
      />
      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={value.metricNames}
        onChange={(event, newValue): void => {
          onChange({ ...value, metricNames: newValue });
        }}
        renderInput={(params) => (
          <TextField {...params} required label="Metric Names" size="small" placeholder="e.g. Percentage CPU" />
        )}
      />
      <Autocomplete
        multiple
        disableCloseOnSelect
        options={AGGREGATION_TYPES}
        value={value.aggregation ?? []}
        onChange={(event, newValue): void => {
          onChange({ ...value, aggregation: newValue.length ? newValue : undefined });
        }}
        renderOption={(optionProps, option, { selected }) => {
          const { key, ...rest } = optionProps;
          return (
            <li key={key} {...rest}>
              <Checkbox checked={selected} />
              {option}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Aggregation"
            size="small"
            helperText="Optional - If not specified, Azure will pick the most relevant one based on the metric"
          />
        )}
      />
      <TextField
        fullWidth
        multiline
        size="small"
        label="Filter"
        helperText="Optional - As specified in https://learn.microsoft.com/en-us/rest/api/monitor/filter-syntax"
        value={localFields.filter}
        onChange={handleFieldChange('filter')}
        onBlur={commitOptionalStringField('filter')}
      />
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          size="small"
          label="Interval"
          placeholder="PT5M"
          helperText="Optional - Datapoint length in ISO 8601 duration format"
          value={localFields.interval}
          onChange={handleFieldChange('interval')}
          onBlur={commitOptionalStringField('interval')}
          disabled={singlePoint}
        />
        <Stack direction="row" spacing={0} alignItems="center">
          <FormControlLabel
            control={<Checkbox checked={singlePoint} onChange={handleCheckboxChange('singlePoint')} />}
            label="Single Point"
          />
          <HelpInfoTooltip description="Return a single data point for the entire time range per timeseries. Equivalent to interval='FULL'" />
        </Stack>
        <Stack direction="row" spacing={0} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={value.flattenMetrics ?? false}
                onChange={handleCheckboxChange('flattenMetrics')}
                disabled={!singlePoint}
              />
            }
            label="Flatten Metrics"
          />
          <HelpInfoTooltip description="Flatten metrics into a single time series (per unique set of metadata) with a single data point per resource ID. Values of each metric-aggregation are mapped to individual labels. Mainly useful for tables to display values for multiple metrics on a single resource ID in a single row." />
        </Stack>
        <TextField
          size="small"
          label="Top"
          type="number"
          helperText="Optional - Records per resource ID"
          value={localFields.top}
          onChange={handleFieldChange('top')}
          onBlur={commitOptionalNumberField('top')}
        />
      </Stack>
      <TextField
        fullWidth
        size="small"
        label="Order By"
        placeholder="e.g. total asc"
        helperText="Optional - Aggregation and direction to sort by"
        value={localFields.orderBy}
        onChange={handleFieldChange('orderBy')}
        onBlur={commitOptionalStringField('orderBy')}
      />
      <TextField
        fullWidth
        size="small"
        label="Rollup By"
        helperText="Optional - Metadata dimension to roll up (group) results by"
        value={localFields.rollupBy}
        onChange={handleFieldChange('rollupBy')}
        onBlur={commitOptionalStringField('rollupBy')}
      />
    </Stack>
  );
}

function HelpInfoTooltip(props: { description: string }): ReactElement {
  return (
    <InfoTooltip description={props.description} enterDelay={100}>
      <IconButton
        size="small"
        sx={(theme) => ({ borderRadius: theme.shape.borderRadius, padding: '4px', margin: '0 2px' })}
      >
        <InformationOutlineIcon
          aria-describedby="info-tooltip"
          aria-hidden={false}
          fontSize="inherit"
          sx={{ color: (theme) => theme.palette.grey[700] }}
        />
      </IconButton>
    </InfoTooltip>
  );
}
