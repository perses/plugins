import { OptionsEditorProps, useListPluginMetadata, VariablePlugin } from '@perses-dev/plugin-system';
import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useMemo } from 'react';

type StaticListVariableOptions = {
  datasourcePluginKind: string;
};

const DatasourceVariableOptionEditor = (props: OptionsEditorProps<StaticListVariableOptions>) => {
  const { onChange, value } = props;
  const { datasourcePluginKind } = value;
  const { data: datasourcePlugins, isLoading } = useListPluginMetadata(['Datasource']);
  const datasourcePluginKindSet = useMemo(
    () => new Set(datasourcePlugins?.map((plugin) => plugin.spec.name)),
    [datasourcePlugins]
  );

  useEffect(() => {
    if (datasourcePluginKind === '' && datasourcePluginKindSet.size > 0) {
      onChange({
        datasourcePluginKind: Array.from(datasourcePluginKindSet)[0],
      });
    }
  }, [datasourcePluginKindSet, datasourcePluginKind, onChange]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (datasourcePlugins === undefined) {
    return <div>No data</div>;
  }

  const options = Array.from(datasourcePluginKindSet).map((kind) => ({
    label: kind,
    value: kind,
  }));

  const selectedKind = options.find((option) => option.label === datasourcePluginKind) ?? options[0];

  return (
    <Autocomplete
      options={options}
      disableClearable
      renderInput={(params) => (
        <TextField {...params} label="Datasource Plugin Kinds" placeholder="Datasource Plugin Kinds" />
      )}
      value={selectedKind}
      onChange={(event, newValue) => {
        if (newValue === null) {
          return;
        }

        onChange({
          datasourcePluginKind: newValue.label,
        });
      }}
    />
  );
};

export const DatasourceVariable: VariablePlugin<StaticListVariableOptions> = {
  getVariableOptions: async (spec, ctx) => {
    if (spec.datasourcePluginKind === '') return { data: [] };
    const datasourceSelectItemGroups = await ctx.datasourceStore.listDatasourceSelectItems(spec.datasourcePluginKind);
    const flattenedSelectItems = datasourceSelectItemGroups.flatMap((group) => group.items);

    const data = flattenedSelectItems.map((item) => ({
      label: item.name,
      value: item.name,
    }));

    return { data };
  },
  OptionsEditorComponent: DatasourceVariableOptionEditor,
  createInitialOptions: () => ({ datasourcePluginKind: '' }),
};
