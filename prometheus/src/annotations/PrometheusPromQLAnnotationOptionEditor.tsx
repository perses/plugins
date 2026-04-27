import { ReactElement } from 'react';
import { useId } from '@perses-dev/components';
import { produce } from 'immer';
import { Autocomplete, Chip, FormControl, Stack, TextField } from '@mui/material';
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
  title?: string;
  legend?: string;
  tags?: string[];
}

export type PrometheusAnnotationsQueryEditorProps = OptionsEditorProps<PrometheusAnnotationsQuerySpec>;

export function PrometheusPromQLAnnotationOptionEditor(props: PrometheusAnnotationsQueryEditorProps): ReactElement {
  const {
    onChange,
    value,
    value: { expr, datasource, title, legend, tags },
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

  const handleExprChange = (next: string): void => {
    onChange(
      produce(value, (draft) => {
        draft.expr = next;
      })
    );
  };

  const handleTitleChange = (next: string): void => {
    onChange(
      produce(value, (draft) => {
        draft.title = next || undefined;
      })
    );
  };

  const handleLegendChange = (next: string): void => {
    onChange(
      produce(value, (draft) => {
        draft.legend = next || undefined;
      })
    );
  };

  const handleTagsChange = (next: string[]): void => {
    onChange(
      produce(value, (draft) => {
        draft.tags = next.length > 0 ? next : undefined;
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
      <TextField
        fullWidth
        label="Title"
        placeholder="Example: 'Deployment {{service}}'"
        helperText="Title displayed in the annotation tooltip. Use {{label_name}} to interpolate label values."
        value={title ?? ''}
        onChange={(e) => handleTitleChange(e.target.value)}
        slotProps={{
          inputLabel: { shrink: isReadonly ? true : undefined },
          input: { readOnly: isReadonly },
        }}
      />
      <TextField
        fullWidth
        label="Legend"
        placeholder="Example: '{{instance}}' will generate annotation legends like 'webserver-123'..."
        helperText="Text displayed below the title in the annotation tooltip. Use {{label_name}} to interpolate label values."
        value={legend ?? ''}
        onChange={(e) => handleLegendChange(e.target.value)}
        slotProps={{
          inputLabel: { shrink: isReadonly ? true : undefined },
          input: { readOnly: isReadonly },
        }}
      />
      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={tags ?? []}
        onChange={(_, next) => handleTagsChange(next as string[])}
        readOnly={isReadonly}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Tags"
            placeholder="Add label names..."
            helperText="Label names to display as tags in the annotation tooltip. Leave empty to show all labels. Press Enter to add."
          />
        )}
      />
    </Stack>
  );
}
