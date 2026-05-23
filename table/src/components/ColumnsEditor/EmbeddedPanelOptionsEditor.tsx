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

import { CircularProgress, Stack, Typography } from '@mui/material';
import { UnknownSpec } from '@perses-dev/core';
import { OptionsEditorTabs, PanelPlugin, usePlugin } from '@perses-dev/plugin-system';
import merge from 'lodash/merge';
import { ReactElement, useEffect, useMemo, useRef } from 'react';

export interface EmbeddedPanelOptionsEditorProps {
  kind: string;
  spec: UnknownSpec;
  onChange: (next: UnknownSpec) => void;
}

function isSpecEmpty(spec: UnknownSpec | undefined): boolean {
  if (spec === undefined || spec === null) return true;
  if (typeof spec !== 'object') return false;
  return Object.keys(spec as object).length === 0;
}

function mergeWithPluginDefaults(plugin: PanelPlugin, spec: UnknownSpec | undefined): UnknownSpec {
  const initial = plugin.createInitialOptions() ?? {};
  return merge({}, initial, spec ?? {}) as UnknownSpec;
}

/**
 * Renders a panel plugin's settings tabs (thresholds, units, colors, …).
 * Used for embedded GaugeChart columns only; other embedded panel kinds use defaults.
 */
export function EmbeddedPanelOptionsEditor({ kind, spec, onChange }: EmbeddedPanelOptionsEditorProps): ReactElement {
  const { data: plugin, isLoading, isError, error } = usePlugin('Panel', kind);

  const panelPlugin = plugin as PanelPlugin | undefined;

  const mergedSpec = useMemo(() => {
    if (!panelPlugin) {
      return spec;
    }
    return mergeWithPluginDefaults(panelPlugin, spec);
  }, [panelPlugin, spec]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Persist plugin defaults when the column still has an empty spec (e.g. after switching panel kind).
  useEffect(() => {
    if (!panelPlugin || !isSpecEmpty(spec)) {
      return;
    }
    onChangeRef.current(mergeWithPluginDefaults(panelPlugin, spec));
  }, [panelPlugin, kind, spec]);

  if (isLoading) {
    return (
      <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Loading panel settings…
        </Typography>
      </Stack>
    );
  }

  if (isError || !plugin) {
    return (
      <Typography variant="body2" color="error">
        {error?.message ?? 'Could not load panel plugin.'}
      </Typography>
    );
  }

  const loadedPlugin = plugin as PanelPlugin;
  const editorTabs = loadedPlugin.panelOptionsEditorComponents ?? [];

  if (editorTabs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        This visualization has no editable settings.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ width: '100%', py: 1 }}>
      <OptionsEditorTabs
        tabs={editorTabs.map((tab) => {
          const Content = tab.content;
          return {
            label: tab.label,
            content: (
              <Content
                value={mergedSpec}
                onChange={(next) => {
                  onChange(next as UnknownSpec);
                }}
              />
            ),
          };
        })}
      />
    </Stack>
  );
}
