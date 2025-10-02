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
  DatasourceSelect,
  DatasourceSelectProps,
  isVariableDatasource,
  OptionsEditorProps,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { InputLabel, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ReactElement, useCallback, useState, useEffect } from 'react';
import { produce } from 'immer';
import { OptionsEditorControl } from '@perses-dev/components';
import { LogQLEditor } from '../../components/logql-editor';
import { isDefaultLokiSelector, LOKI_DATASOURCE_KIND, LokiDatasourceSelector } from '../../model';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from '../constants';
import { LokiLogQuerySpec } from './loki-log-query-types';
import { useQueryState } from '../query-editor-model';

type LokiQueryEditorProps = OptionsEditorProps<LokiLogQuerySpec>;

export function LokiLogQueryEditor(props: LokiQueryEditorProps): ReactElement {
  const { onChange, value, queryHandlerSettings } = props;
  const { datasource } = value;
  const datasourceSelectValue = datasource ?? DEFAULT_DATASOURCE;
  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    LOKI_DATASOURCE_KIND
  ) as LokiDatasourceSelector;
  const { query, handleQueryChange, handleQueryBlur } = useQueryState(props);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange(
        produce(value, (draft) => {
          // If they're using the default, just omit the datasource prop (i.e. set to undefined)
          const nextDatasource = isDefaultLokiSelector(newDatasourceSelection) ? undefined : newDatasourceSelection;
          draft.datasource = nextDatasource;
        })
      );

      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings.setWatchOtherSpecs({ ...value, datasource: newDatasourceSelection });
      return;
    }

    throw new Error('Got unexpected non LokiQuery datasource selection');
  };

  const handleLogsDirection = (_: React.MouseEvent, v: 'backward' | 'forward') =>
    onChange(
      produce(value, (draft: LokiLogQuerySpec) => {
        draft.direction = v;
      })
    );

  // Immediate query execution on Enter or blur
  const handleQueryExecute = (query: string) => {
    if (queryHandlerSettings?.watchQueryChanges) {
      queryHandlerSettings.watchQueryChanges(query);
    }
    onChange(
      produce(value, (draft) => {
        draft.query = query;
      })
    );
  };

  const handleLogsQueryChange = useCallback(
    (e: string) => {
      handleQueryChange(e);
      if (queryHandlerSettings?.watchQueryChanges) {
        queryHandlerSettings.watchQueryChanges(e);
      }
    },
    [handleQueryChange, queryHandlerSettings]
  );

  return (
    <Stack spacing={1.5} paddingBottom={1}>
      <div>
        <InputLabel
          sx={{
            display: 'block',
            marginBottom: '4px',
            fontWeight: 500,
          }}
        >
          Datasource
        </InputLabel>
        <DatasourceSelect
          datasourcePluginKind={DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          label="Loki Datasource"
          notched
        />
      </div>

      <div>
        <InputLabel
          sx={{
            display: 'block',
            marginBottom: '4px',
            fontWeight: 500,
          }}
        >
          LogQL Query
        </InputLabel>
        <LogQLEditor
          value={query}
          onChange={handleLogsQueryChange}
          onBlur={queryHandlerSettings?.runWithOnBlur ? handleQueryBlur : undefined}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              handleQueryExecute(query);
            }
          }}
          placeholder='Enter LogQL query (e.g. {job="mysql"} |= "error")'
          // height="120px"
        />
      </div>
      <div>
        <OptionsEditorControl
          label="Order"
          // description="Percentage means thresholds relative to min & max"
          control={
            <ToggleButtonGroup
              exclusive
              value={value?.direction ?? 'backward'}
              onChange={handleLogsDirection}
              sx={{ height: '36px', marginLeft: '10px', width: 'max-content' }}
            >
              <ToggleButton aria-label="backward" value="backward" sx={{ fontWeight: 500 }}>
                Newest first
              </ToggleButton>
              <ToggleButton aria-label="forward" value="forward" sx={{ fontWeight: 500 }}>
                Oldest first
              </ToggleButton>
            </ToggleButtonGroup>
          }
        />
      </div>
    </Stack>
  );
}
