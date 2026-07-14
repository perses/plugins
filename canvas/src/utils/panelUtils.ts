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

import { ThresholdOptions, TimeSeries } from '@perses-dev/core';
import { FormatOptions, formatValue } from '@perses-dev/components';
import { BackgroundSpec } from '../model';

export function isSafeImageUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    if (protocol === 'https:') {
      return true;
    }
    if (protocol === 'data:') {
      return (
        url.startsWith('data:image/png') ||
        url.startsWith('data:image/jpeg') ||
        url.startsWith('data:image/gif') ||
        url.startsWith('data:image/webp') ||
        url.startsWith('data:image/avif')
      );
    }
    return false;
  } catch {
    return false;
  }
}

export function imageFitToPreserveAspectRatio(imageFit: BackgroundSpec['imageFit']): string {
  switch (imageFit) {
    case 'stretch':
      return 'none';
    case 'contain':
      return 'xMidYMid meet';
    case 'cover':
      return 'xMidYMid slice';
    default:
      return 'xMidYMid slice';
  }
}

export function interpolateLabel(template: string, series: TimeSeries, format: FormatOptions | undefined): string {
  const lastValue = series.values.length > 0 ? series.values[series.values.length - 1]?.[1] : null;
  const labels: Record<string, string> = { ...series.labels };
  if (lastValue !== null && lastValue !== undefined) {
    labels['value'] = formatValue(lastValue, format);
  }
  return template.replace(/{{\s*(.+?)\s*}}/g, (_match, key: string) => labels[key.trim()] ?? '');
}

export function colorFromThresholds(
  thresholdValue: number,
  thresholds: ThresholdOptions,
  paletteColors: string[],
  fallbackColor: string
): string {
  const defaultColor = thresholds.defaultColor ?? paletteColors[0] ?? fallbackColor;
  if (!thresholds.steps?.length) {
    return defaultColor;
  }
  let result = defaultColor;
  for (let i = 0; i < thresholds.steps.length; i++) {
    const step = thresholds.steps[i];
    if (step && thresholdValue >= step.value) {
      result = step.color ?? paletteColors[i] ?? defaultColor;
    }
  }
  return result;
}
