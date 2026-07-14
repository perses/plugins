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

import { LabelPosition } from '../model';

const DEFAULT_PADDING = 12;

interface LabelAttrs {
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'hanging' | 'middle' | 'auto';
}

export function labelAttrs(
  halfW: number,
  halfH: number,
  position: LabelPosition | undefined,
  padding: number | undefined
): LabelAttrs {
  const pos = position ?? 'below';
  const pad = padding ?? DEFAULT_PADDING;

  switch (pos) {
    case 'above':
      return { x: 0, y: -(halfH + pad), textAnchor: 'middle', dominantBaseline: 'auto' };
    case 'left':
      return { x: -(halfW + pad), y: 0, textAnchor: 'end', dominantBaseline: 'middle' };
    case 'right':
      return { x: halfW + pad, y: 0, textAnchor: 'start', dominantBaseline: 'middle' };
    case 'center':
      return { x: 0, y: 0, textAnchor: 'middle', dominantBaseline: 'middle' };
    case 'below':
    default:
      return { x: 0, y: halfH + pad, textAnchor: 'middle', dominantBaseline: 'hanging' };
  }
}
