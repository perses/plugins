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

/**
 * The Options object type supported by the TracingGanttChart panel plugin.
 */
// Note: The interface attributes must match schemas/tracing-gantt-chart.cue
export interface TracingGanttChartOptions {
  visual?: TracingGanttChartVisualOptions;
  links?: TracingGanttChartCustomLinks;
  /**
   * Span ID of the initially selected span.
   * This property is used in the explore view when clicking on span links, and is intentionally not exposed in the Cue schema.
   */
  selectedSpanId?: string;
}

export interface TracingGanttChartVisualOptions {
  palette?: TracingGanttChartPaletteOptions;
}

export interface TracingGanttChartPaletteOptions {
  mode: 'auto' | 'categorical';
}

export interface TracingGanttChartCustomLinks {
  /**
   * Link to a trace.
   * Supported variables: datasourceName, traceId
   */
  trace?: string;

  /**
   * Link to a trace, with the span selected.
   * Supported variables: datasourceName, traceId, spanId
   */
  span?: string;
  attributes?: TracingGanttChartCustomAttributeLink[];
}

export interface TracingGanttChartCustomAttributeLink {
  name: string;
  /**
   * Link to an arbitrary attribute value.
   * Supported variables: datasourceName and all other attributes
   */
  link: string;
}

export interface CustomLinks {
  variables: Record<string, string>;
  links: TracingGanttChartCustomLinks;
}

/**
 * Creates the initial/empty options for a TracingGanttChart panel.
 */
export function createInitialTracingGanttChartOptions(): Record<string, unknown> {
  return {};
}
