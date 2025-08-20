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

import { Box, Button, FormControl, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import { useId } from '@perses-dev/components';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  useDatasourceClient,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useState } from 'react';
import { TraceQLEditor } from '../../components';
import { TempoClient } from '../../model/tempo-client';
import {
  DEFAULT_TEMPO,
  isDefaultTempoSelector,
  isTempoDatasourceSelector,
  TEMPO_DATASOURCE_KIND,
} from '../../model/tempo-selectors';
import { AttributeFilters } from '../../components/AttributeFilters';
import { filterToTraceQL } from '../../components/filter/filter_to_traceql';
import { traceQLToFilter } from '../../components/filter/traceql_to_filter';
import { TraceQueryEditorProps, useQueryState } from './query-editor-model';

export function TempoTraceQueryEditor(props: TraceQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource, limit } = value;
  const datasourceSelectValue = datasource ?? DEFAULT_TEMPO;
  const selectedDatasource = useDatasourceSelectValueToSelector(datasourceSelectValue, TEMPO_DATASOURCE_KIND);
  const datasourceSelectLabelID = useId('tempo-datasource-label'); // for panels with multiple queries, this component is rendered multiple times on the same page

  const { data: client } = useDatasourceClient<TempoClient>(selectedDatasource);
  const { query, handleQueryChange, handleQueryBlur } = useQueryState(props);
  const [showAttributeFilters, setShowAttributeFilters] = useState(() => isSimpleTraceQLQuery(query));

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isTempoDatasourceSelector(next)) {
      onChange(
        produce(value, (draft) => {
          // If they're using the default, just omit the datasource prop (i.e. set to undefined)
          const nextDatasource = isDefaultTempoSelector(next) ? undefined : next;
          draft.datasource = nextDatasource;
        })
      );
      return;
    }

    throw new Error('Got unexpected non-Tempo datasource selector');
  };

  const runQuery = (newQuery: string) => {
    onChange(
      produce(value, (draft) => {
        draft.query = newQuery;
      })
    );
  };

  return (
    <Stack spacing={2}>
      <FormControl margin="dense" fullWidth={false}>
        <DatasourceSelect
          datasourcePluginKind={TEMPO_DATASOURCE_KIND}
          value={datasourceSelectValue}
          onChange={handleDatasourceChange}
          labelId={datasourceSelectLabelID}
          label="Tempo Datasource"
          notched
        />
      </FormControl>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        {showAttributeFilters ? (
          <AttributeFilters client={client} query={query} setQuery={runQuery} />
        ) : (
          <TraceQLEditor client={client} value={query} onChange={handleQueryChange} onBlur={handleQueryBlur} />
        )}
        <Button onClick={() => setShowAttributeFilters(!showAttributeFilters)}>
          {showAttributeFilters ? 'Show query' : 'Hide query'}
        </Button>
        <LimitSelect
          value={limit ?? 20}
          setValue={(newLimit: number) =>
            onChange(
              produce(value, (draft) => {
                draft.limit = newLimit;
              })
            )
          }
        />
      </Stack>
    </Stack>
  );
}

function isSimpleTraceQLQuery(query: string) {
  // if a query can be transformed to a filter and back to the original query, we can show the attribute filter toolbar
  return query == '' || filterToTraceQL(traceQLToFilter(query)) === query;
}

const limitOptions = [20, 50, 100, 500, 1000, 5000];

interface LimitSelectProps {
  value: number;
  setValue: (x: number) => void;
}

export function LimitSelect(props: LimitSelectProps) {
  const { value, setValue } = props;

  // the outer <Box> is required, because <FormControl> has display: inline-flex, which doesn't work with the parent <Stack> of the query editor
  return (
    <Box>
      <FormControl size="small">
        <InputLabel id="max-traces-label">Max Traces</InputLabel>
        <Select
          labelId="max-traces-label"
          id="max-traces-select"
          value={value}
          label="Max Traces"
          onChange={(e) => setValue(typeof e.target.value === 'number' ? e.target.value : parseInt(e.target.value))}
          sx={{ width: 110 }}
        >
          {limitOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
