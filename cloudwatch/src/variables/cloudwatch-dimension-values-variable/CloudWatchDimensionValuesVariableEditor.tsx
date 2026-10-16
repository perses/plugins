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

import { Stack, TextField } from '@mui/material';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect, isVariableDatasource } from '@perses-dev/plugin-system';
import type { ChangeEvent, ReactElement } from 'react';
import { useCallback, useMemo } from 'react';

import { DimensionsEditor } from '../../components/DimensionsEditor';
import type { CloudWatchDimensions } from '../../model';
import { CLOUDWATCH_DATASOURCE_KIND, DEFAULT_CLOUDWATCH } from '../../model';
import type { CloudWatchDimensionValuesVariableSpec } from './cloudwatch-dimension-values-variable-types';

export function CloudWatchDimensionValuesVariableEditor({
  value,
  onChange,
  isReadonly,
}: OptionsEditorProps<CloudWatchDimensionValuesVariableSpec>): ReactElement {
  const readOnlyProps = useMemo(() => ({ input: { readOnly: isReadonly } }), [isReadonly]);

  const handleDatasourceChange = useCallback<DatasourceSelectProps['onChange']>(
    (next) => {
      if (!isVariableDatasource(next) && next.kind === CLOUDWATCH_DATASOURCE_KIND) {
        onChange({ ...value, datasource: next });
      }
    },
    [onChange, value],
  );
  const handleNamespaceChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => onChange({ ...value, namespace: event.target.value }),
    [onChange, value],
  );
  const handleMetricNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => onChange({ ...value, metricName: event.target.value || undefined }),
    [onChange, value],
  );
  const handleDimensionKeyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => onChange({ ...value, dimensionKey: event.target.value }),
    [onChange, value],
  );
  const handleDimensionsChange = useCallback(
    (dimensions?: CloudWatchDimensions): void => onChange({ ...value, dimensions }),
    [onChange, value],
  );

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind={CLOUDWATCH_DATASOURCE_KIND}
        value={value.datasource ?? DEFAULT_CLOUDWATCH}
        label="CloudWatch Datasource"
        readOnly={isReadonly}
        onChange={handleDatasourceChange}
      />
      <TextField
        label="Namespace"
        required
        value={value.namespace}
        slotProps={readOnlyProps}
        helperText="For example AWS/EC2."
        onChange={handleNamespaceChange}
      />
      <TextField
        label="Metric name"
        value={value.metricName ?? ''}
        slotProps={readOnlyProps}
        helperText="Optional. Narrows the metrics to discover, which is faster on large accounts."
        onChange={handleMetricNameChange}
      />
      <TextField
        label="Dimension"
        required
        value={value.dimensionKey}
        slotProps={readOnlyProps}
        helperText="The values of this dimension are the options of the variable, for example InstanceId."
        onChange={handleDimensionKeyChange}
      />
      <DimensionsEditor
        label="Filters"
        value={value.dimensions}
        readOnly={isReadonly}
        onChange={handleDimensionsChange}
      />
    </Stack>
  );
}
