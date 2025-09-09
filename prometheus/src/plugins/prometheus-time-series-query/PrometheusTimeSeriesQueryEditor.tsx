// Copyright 2023 The Perses Authors
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

import { produce } from 'immer';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  useDatasource,
  useDatasourceClient,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { useId } from '@perses-dev/components';
import { FormControl, Stack, TextField } from '@mui/material';
import { ReactElement, useCallback } from 'react';
import {
  DEFAULT_PROM,
  DurationString,
  isDefaultPromSelector,
  isPrometheusDatasourceSelector,
  PROM_DATASOURCE_KIND,
  PrometheusClient,
  PrometheusDatasourceSelector,
} from '../../model';
import { DEFAULT_SCRAPE_INTERVAL, PrometheusDatasourceSpec } from '../types';
import { PromQLEditor } from '../../components';
import {
  PrometheusTimeSeriesQueryEditorProps,
  useQueryState,
  useFormatState,
  useMinStepState,
} from './query-editor-model';

/**
 * The options editor component for editing a PrometheusTimeSeriesQuery's spec.
 */
export function PrometheusTimeSeriesQueryEditor(props: PrometheusTimeSeriesQueryEditorProps): ReactElement {
  const {
    onChange,
    value,
    value: { query, datasource },
    queryHandlerSettings,
    isReadonly,
  } = props;

  const datasourceSelectValue = datasource ?? DEFAULT_PROM;

  const datasourceSelectLabelID = useId('prom-datasource-label'); // for panels with multiple queries, this component is rendered multiple times on the same page

  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    PROM_DATASOURCE_KIND
  ) as PrometheusDatasourceSelector;

  const { data: client } = useDatasourceClient<PrometheusClient>(selectedDatasource);
  const promURL = client?.options.datasourceUrl;
  const { data: datasourceResource } = useDatasource(selectedDatasource);

  const { handleQueryChange, handleQueryBlur } = useQueryState(props);
  const { format, handleFormatChange, handleFormatBlur } = useFormatState(props);
  const { minStep, handleMinStepChange, handleMinStepBlur } = useMinStepState(props);
  const minStepPlaceholder =
    minStep ??
    (datasourceResource && (datasourceResource?.plugin.spec as PrometheusDatasourceSpec).scrapeInterval) ??
    DEFAULT_SCRAPE_INTERVAL;

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isPrometheusDatasourceSelector(next)) {
      /* Good to know: The usage of onchange here causes an immediate spec update which eventually updates the panel
         This was probably intentional to allow for quick switching between datasources.
         Could have been triggered only with Run Query button as well.
      */
      onChange(
        produce(value, (draft) => {
          // If they're using the default, just omit the datasource prop (i.e. set to undefined)
          const nextDatasource = isDefaultPromSelector(next) ? undefined : next;
          draft.datasource = nextDatasource;
        })
      );
      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings.setWatchOtherSpecs({ ...value, datasource: next });
      return;
    }

    throw new Error('Got unexpected non-Prometheus datasource selector');
  };

  const handlePromQlEditorChanges = useCallback(
    (e: string) => {
      handleQueryChange(e);
      if (queryHandlerSettings?.watchQueryChanges) {
        queryHandlerSettings?.watchQueryChanges(e);
      }
    },
    [queryHandlerSettings, handleQueryChange]
  );

  const handleLegendSpecChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleFormatChange(e.target.value);
      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings.setWatchOtherSpecs({ ...value, seriesNameFormat: e.target.value });
    },
    [queryHandlerSettings, handleFormatChange, value]
  );

  const handleMinStepSpecChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleMinStepChange(e.target.value ? (e.target.value as DurationString) : undefined);
      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings.setWatchOtherSpecs({ ...value, minStep: e.target.value });
    },
    [queryHandlerSettings, handleMinStepChange, value]
  );

  return (
    <Stack spacing={2}>
      <FormControl margin="dense" fullWidth={false}>
        <DatasourceSelect
          datasourcePluginKind={PROM_DATASOURCE_KIND}
          value={datasourceSelectValue}
          onChange={handleDatasourceChange}
          labelId={datasourceSelectLabelID}
          label="Prometheus Datasource"
          notched
          readOnly={isReadonly}
        />
      </FormControl>
      <PromQLEditor
        completeConfig={{ remote: { url: promURL } }}
        value={query} // here we are passing `value.query` and not `query` from useQueryState in order to get updates only on onBlur events
        datasource={selectedDatasource}
        onChange={handlePromQlEditorChanges}
        onBlur={queryHandlerSettings?.runWithOnBlur ? handleQueryBlur : undefined}
        isReadOnly={isReadonly}
      />
      <Stack direction="row" spacing={2}>
        <TextField
          fullWidth
          label="Legend"
          placeholder="Example: '{{instance}}' will generate series names like 'webserver-123', 'webserver-456'..."
          helperText="Text to be displayed in the legend and the tooltip. Use {{label_name}} to interpolate label values."
          value={format ?? ''}
          onChange={handleLegendSpecChange}
          onBlur={queryHandlerSettings?.runWithOnBlur ? handleFormatBlur : undefined}
          disabled={isReadonly}
        />
        <TextField
          label="Min Step"
          placeholder={minStepPlaceholder}
          helperText="Lower bound for the step. If not provided, the scrape interval of the datasource is used."
          value={minStep ?? ''}
          onChange={handleMinStepSpecChange}
          onBlur={queryHandlerSettings?.runWithOnBlur ? handleMinStepBlur : undefined}
          sx={{ width: '250px' }}
          disabled={isReadonly}
        />
      </Stack>
    </Stack>
  );
}
