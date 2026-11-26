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

import { Stack } from '@mui/material';
import type { OptionsEditorProps } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';

import { ClickHouseDatasourceSelect, DraftTextField, QueryExamples, SQLField } from '../../components';
import { TIME_SERIES_EXAMPLES } from '../../components/query-examples';
import type { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';

type ClickHouseTimeSeriesQueryEditorProps = OptionsEditorProps<ClickHouseTimeSeriesQuerySpec>;

export function ClickHouseTimeSeriesQueryEditor(props: ClickHouseTimeSeriesQueryEditorProps): ReactElement {
  const { onChange, value, isReadonly } = props;

  return (
    <Stack spacing={1.5}>
      <ClickHouseDatasourceSelect
        value={value.datasource}
        onChange={(datasource) => onChange({ ...value, datasource })}
        isReadonly={isReadonly}
      />
      <SQLField
        label="ClickHouse Query"
        value={value.query}
        onChange={(query) => onChange({ ...value, query })}
        placeholder="Enter ClickHouse SQL query"
        isReadonly={isReadonly}
      />
      <Stack direction="row" spacing={1.5}>
        <DraftTextField
          label="Series Name Format"
          value={value.seriesNameFormat}
          onChange={(seriesNameFormat) => onChange({ ...value, seriesNameFormat: seriesNameFormat || undefined })}
          placeholder="Example: {{ServiceName}} - {{SpanName}}"
          helperText="Text of the legend: each {{label}} is replaced by the value of the label of the series."
          isReadonly={isReadonly}
        />
        <DraftTextField
          label="Min Step"
          value={value.minStep}
          onChange={(minStep) => onChange({ ...value, minStep: minStep.trim() || undefined })}
          placeholder="Example: 1m"
          helperText="Lower bound of the interval of the macros, such as the interval the data is written at."
          isReadonly={isReadonly}
          fullWidth={false}
          sx={{ width: 280, flexShrink: 0 }}
        />
      </Stack>
      <SQLField
        label="Exemplar Query (optional)"
        value={value.exemplarQuery}
        onChange={(exemplarQuery) =>
          onChange({ ...value, exemplarQuery: exemplarQuery.trim() ? exemplarQuery : undefined })
        }
        placeholder="Enter a ClickHouse SQL query returning the exemplars of the series"
        isReadonly={isReadonly}
      />
      <QueryExamples examples={TIME_SERIES_EXAMPLES} />
    </Stack>
  );
}
