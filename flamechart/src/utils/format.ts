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

import { msToPrometheusDuration, formatDuration, formatBytes } from '@perses-dev/core';

export function formatCount(value: number): string {
  const formatterOptions: Intl.NumberFormatOptions = {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 2,
  };

  const formatter = Intl.NumberFormat('en-US', formatterOptions);
  return formatter.format(value);
}

export function formatNanoDuration(value: number): string {
  // The value to format is in nanoseconds
  const nanosecondsInMillisecond = 1_000_000;
  if (value < nanosecondsInMillisecond) {
    return formatCount(value) + ' ns';
  } else {
    return formatDuration(msToPrometheusDuration(value / nanosecondsInMillisecond));
  }
}

export function formatValue(unit: string | undefined, value: number): string {
  let valueWithUnit = '';
  switch (unit) {
    case 'count':
      valueWithUnit = formatCount(value);
      break;
    case 'samples':
      valueWithUnit = formatCount(value);
      break;
    case 'objects':
      valueWithUnit = `${formatCount(value)} objects`;
      break;
    case 'bytes':
      valueWithUnit = formatBytes(value, { unit: 'bytes' });
      break;
    case 'nanoseconds':
      valueWithUnit = formatNanoDuration(value);
      break;
    default:
      valueWithUnit = `${value} ${unit}`;
      break;
  }
  return valueWithUnit;
}
