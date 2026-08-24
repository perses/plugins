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

import type { PanelPlugin } from '@perses-dev/plugin-system';

import type { TracingGanttChartOptions } from './gantt-chart-model';
import { createInitialTracingGanttChartOptions } from './gantt-chart-model';
import { DownloadTraceAction } from './PanelActions';
import type { TracingGanttChartPanelProps } from './TracingGanttChartPanel';
import { TracingGanttChartPanel } from './TracingGanttChartPanel';

export const TracingGanttChart: PanelPlugin<TracingGanttChartOptions, TracingGanttChartPanelProps> = {
  PanelComponent: TracingGanttChartPanel,
  supportedQueryTypes: ['TraceQuery'],
  createInitialOptions: createInitialTracingGanttChartOptions,
  actions: [{ component: DownloadTraceAction }],
};
