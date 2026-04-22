import { ReactElement } from 'react';
import { useId } from '@perses-dev/components';
import { produce } from 'immer';
import { FormControl, Stack } from '@mui/material';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  DatasourceSelectValue,
  OptionsEditorProps,
  useDatasourceClient,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import {
  DEFAULT_PROM,
  isDefaultPromSelector,
  isPrometheusDatasourceSelector,
  PROM_DATASOURCE_KIND,
  PrometheusClient,
  PrometheusDatasourceSelector,
} from '../model';

import { PromQLEditor } from '../components';

export interface PrometheusAnnotationsQuerySpec {
  expr: string;
  datasource?: DatasourceSelectValue<PrometheusDatasourceSelector>;
}

export type PrometheusAnnotationsQueryEditorProps = OptionsEditorProps<PrometheusAnnotationsQuerySpec>;

export function PrometheusPromQLAnnotationOptionEditor(props: PrometheusAnnotationsQueryEditorProps): ReactElement {
  const {
    onChange,
    value,
    value: { expr, datasource },
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

  const handleExprChange = (next: string) => {
    onChange(
      produce(value, (draft) => {
        draft.expr = next;
      })
    );
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
        value={expr}
        datasource={selectedDatasource}
        onChange={handleExprChange}
        isReadOnly={isReadonly}
        treeViewMetadata={undefined}
      />
    </Stack>
  );
}
