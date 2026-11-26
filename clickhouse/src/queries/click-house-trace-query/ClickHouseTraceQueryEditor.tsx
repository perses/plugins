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
import { TRACE_EXAMPLES } from '../../components/query-examples';
import { isTableName } from '../../model/sql';
import type { ClickHouseTraceQuerySpec } from './click-house-trace-query-types';
import { DEFAULT_SEARCH_LIMIT, DEFAULT_TRACE_TABLE } from './click-house-trace-query-types';

type ClickHouseTraceQueryEditorProps = OptionsEditorProps<ClickHouseTraceQuerySpec>;

export function ClickHouseTraceQueryEditor(props: ClickHouseTraceQueryEditorProps): ReactElement {
  const { onChange, value, isReadonly } = props;
  const isTableValid = value.table === undefined || isTableName(value.table);

  const handleLimitChange = (text: string): void => {
    const limit = Number(text);
    onChange({ ...value, limit: text.trim() !== '' && Number.isInteger(limit) && limit > 0 ? limit : undefined });
  };

  return (
    <Stack spacing={1.5}>
      <ClickHouseDatasourceSelect
        value={value.datasource}
        onChange={(datasource) => onChange({ ...value, datasource })}
        isReadonly={isReadonly}
      />
      <SQLField
        label="Trace ID or ClickHouse Query"
        value={value.query}
        onChange={(query) => onChange({ ...value, query })}
        placeholder="Enter a trace ID, or a ClickHouse SQL query returning the TraceId and Timestamp of the spans to search for"
        isReadonly={isReadonly}
      />
      <Stack direction="row" spacing={1.5}>
        <DraftTextField
          label="Trace Table"
          value={value.table}
          onChange={(table) => onChange({ ...value, table: table.trim() || undefined })}
          placeholder={DEFAULT_TRACE_TABLE}
          error={!isTableValid}
          helperText={
            isTableValid
              ? 'Table of the spans, in the OpenTelemetry schema: "table" or "database.table".'
              : 'Expected a table name: "table" or "database.table".'
          }
          isReadonly={isReadonly}
        />
        <DraftTextField
          label="Max Traces"
          type="number"
          value={value.limit === undefined ? '' : String(value.limit)}
          onChange={handleLimitChange}
          placeholder={String(DEFAULT_SEARCH_LIMIT)}
          helperText="Maximum number of traces returned by a search."
          isReadonly={isReadonly}
          sx={{ maxWidth: 220 }}
        />
      </Stack>
      <QueryExamples examples={TRACE_EXAMPLES} />
    </Stack>
  );
}
