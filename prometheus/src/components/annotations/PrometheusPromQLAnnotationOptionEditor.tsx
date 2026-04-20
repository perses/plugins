import { ReactElement } from 'react';
import { useId } from '@perses-dev/components';
import { produce } from 'immer';
import { FormControl, Stack } from '@mui/material';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  useDatasourceClient,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { PrometheusTimeSeriesQueryEditorProps, useQueryState } from '../../plugins';
import {
  DEFAULT_PROM,
  isDefaultPromSelector,
  isPrometheusDatasourceSelector,
  PROM_DATASOURCE_KIND,
  PrometheusClient,
  PrometheusDatasourceSelector,
} from '../../model';

import { PromQLEditor } from '../PromQLEditor';

export function PrometheusPromQLAnnotationOptionEditor(props: PrometheusTimeSeriesQueryEditorProps): ReactElement {
  const {
    onChange,
    value,
    value: { query, datasource },
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

  const { handleQueryChange, handleQueryBlur } = useQueryState(props);

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
      return;
    }

    throw new Error('Got unexpected non-Prometheus datasource selector');
  };

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
        value={query}
        datasource={selectedDatasource}
        onChange={handleQueryChange}
        onBlur={handleQueryBlur}
        isReadOnly={isReadonly}
        treeViewMetadata={undefined}
      />
    </Stack>
  );
}
