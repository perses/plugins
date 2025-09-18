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

import { OptionsEditorProps, useListPluginMetadata, VariablePlugin } from '@perses-dev/plugin-system';
import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useMemo } from 'react';

type StaticListVariableOptions = {
  datasourcePluginKind: string;
};

const EMPTY_SELECTED_KIND = { label: '', value: '' };

export const DatasourceVariableOptionEditor = (props: OptionsEditorProps<StaticListVariableOptions>) => {
  const { onChange, value } = props;
  const { datasourcePluginKind } = value;
  const { data: datasourcePlugins } = useListPluginMetadata(['Datasource']);

  const datasourcePluginKindSet = useMemo(
    () => new Set(datasourcePlugins?.map((plugin) => plugin.spec.name)),
    [datasourcePlugins]
  );

  const options = Array.from(datasourcePluginKindSet).map((kind) => ({
    label: kind,
    value: kind,
  }));

  const selectedKind = options.find((option) => option.label === datasourcePluginKind) ?? EMPTY_SELECTED_KIND;

  // If there is no selected kind and there are available options, select the first one
  useEffect(() => {
    const datasourcePluginKindArray = Array.from(datasourcePluginKindSet);
    if (
      selectedKind.value === EMPTY_SELECTED_KIND.value &&
      datasourcePluginKindArray.length > 0 &&
      datasourcePluginKindArray[0]
    ) {
      onChange({ datasourcePluginKind: datasourcePluginKindArray[0] });
    }
  }, [selectedKind, datasourcePluginKind, onChange, datasourcePluginKindSet]);

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
  dependsOn: () => ({ variables: [] }),
};
