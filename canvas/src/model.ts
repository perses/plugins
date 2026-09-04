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

import type { FormatOptions, ThresholdOptions } from '@perses-dev/components';
import type { PanelProps, LegendSpecOptions, OptionsEditorProps } from '@perses-dev/plugin-system';
import type { TimeSeriesData } from '@perses-dev/spec';

export type QueryData = TimeSeriesData;

export interface Point {
  x: number;
  y: number;
}

export type EdgeEnd = 'source' | 'target';

export type CanvasProps = PanelProps<CanvasSpec, QueryData>;

export interface QueryColorSettings {
  queryIndex: number;
  colorMode: 'fixed' | 'fixed-single';
  colorValue: string;
}

export type LabelPosition = 'above' | 'below' | 'left' | 'right' | 'center';

export interface NodeSpec {
  id: string;
  position: Point;
  width: number;
  height: number;
  kind: 'rectangle' | 'icon' | 'text';
  label?: string;
  labelPosition?: LabelPosition;
  labelPadding?: number;
  icon?: string;
  url?: string;
  background?: string;
  backgroundImage?: string;
  queryIndex?: number;
  colorMode?: 'threshold' | 'fixed';
  color?: string;
}

export type AnchorPoint = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export type ThicknessMode = 'fixed' | 'threshold';

export type Line = { start: Point; end: Point };

export interface SelectionRect {
  anchor: Point;
  corner: Point;
}

export interface NormRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normRect(rect: SelectionRect): NormRect {
  const x = Math.min(rect.anchor.x, rect.corner.x);
  const y = Math.min(rect.anchor.y, rect.corner.y);
  return { x, y, width: Math.abs(rect.corner.x - rect.anchor.x), height: Math.abs(rect.corner.y - rect.anchor.y) };
}

export interface EdgeSpec {
  id: string;
  name?: string;
  source: string;
  target?: string;
  sourceAnchor?: AnchorPoint;
  targetAnchor?: AnchorPoint;
  freeEndpoint?: Point;
  bidirectional?: boolean;
  thicknessMode?: ThicknessMode;
  strokeWidth?: number;
  sourceQueryIndex?: number;
  targetQueryIndex?: number;
  sourceLabelTemplate?: string;
  targetLabelTemplate?: string;
}

export interface EdgeThresholdStep {
  value: number;
  strokeWidth: number;
}

export type FloatingEdge = EdgeSpec & { freeEndpoint: Point };

export function isFloatingEdge(edge: EdgeSpec): edge is FloatingEdge {
  return edge.freeEndpoint !== undefined;
}

export interface BackgroundSpec {
  id: string;
  name?: string;
  position: Point;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  image?: string;
  imageFit?: 'cover' | 'contain' | 'stretch';
  global?: boolean;
}

export interface CanvasSpec {
  legend?: LegendSpecOptions;
  thresholds?: ThresholdOptions;
  format?: FormatOptions;
  edgeThresholdWidths?: EdgeThresholdStep[];
  edgeDefaultStrokeWidth?: number;
  querySettings?: QueryColorSettings[];
  backgrounds?: BackgroundSpec[];
  nodes?: NodeSpec[];
  edges?: EdgeSpec[];
}

export type CanvasSpecEditorProps = OptionsEditorProps<CanvasSpec>;
