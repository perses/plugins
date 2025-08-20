// Copyright 2024 The Perses Authors
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

import { PanelProps } from '@perses-dev/plugin-system';
import { NoDataOverlay, TextOverlay, useChartsTheme } from '@perses-dev/components';
import { Box } from '@mui/material';
import { ReactElement } from 'react';
import { TraceData } from '@perses-dev/core';
import { CustomLinks, TracingGanttChartOptions } from './gantt-chart-model';
import { TracingGanttChart } from './TracingGanttChart/TracingGanttChart';

export type TracingGanttChartPanelProps = PanelProps<TracingGanttChartOptions, TraceData>;

export function TracingGanttChartPanel(props: TracingGanttChartPanelProps): ReactElement {
  const { spec, queryResults } = props;
  const chartsTheme = useChartsTheme();
  const contentPadding = chartsTheme.container.padding.default;

  if (queryResults.length > 1) {
    return <TextOverlay message="This panel does not support more than one query." />;
  }

  const trace = queryResults[0]?.data.trace;
  if (!trace) {
    return <NoDataOverlay resource="trace" />;
  }

  const pluginSpec = queryResults[0]?.definition.spec.plugin.spec as { datasource?: { name?: string } } | undefined;
  const datasourceName = pluginSpec?.datasource?.name;
  const customLinks: CustomLinks | undefined = spec.links
    ? {
        variables: {
          datasourceName: datasourceName ?? '',
        },
        links: spec.links,
      }
    : undefined;

  return (
    <Box sx={{ height: '100%', padding: `${contentPadding}px` }}>
      <TracingGanttChart options={spec} customLinks={customLinks} trace={trace} />
    </Box>
  );
}
