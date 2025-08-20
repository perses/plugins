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

import { msToPrometheusDuration, formatDuration, formatValue } from '@perses-dev/core';

export function formatNanoDuration(value: number): string {
  // The value to format is in nanoseconds
  if (value < 1_000) {
    return formatValue(value, { unit: 'decimal', decimalPlaces: 2, shortValues: true }) + 'ns';
  } else if (value < 1_000_000) {
    return formatValue(value / 1_000, { unit: 'decimal', decimalPlaces: 2, shortValues: true }) + 'μs';
  } else {
    return formatDuration(msToPrometheusDuration(value / 1_000_000));
  }
}

export function formatItemValue(unit: string | undefined, value: number): string {
  let valueWithUnit = '';
  switch (unit) {
    case 'count':
      valueWithUnit = formatValue(value, { unit: 'decimal', decimalPlaces: 2, shortValues: true });
      break;
    case 'samples':
      valueWithUnit = formatValue(value, { unit: 'decimal', decimalPlaces: 2, shortValues: true });
      break;
    case 'objects':
      valueWithUnit = formatValue(value, { unit: 'decimal', decimalPlaces: 2, shortValues: true });
      break;
    case 'bytes':
      valueWithUnit = formatValue(value, { unit: 'bytes' });
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
