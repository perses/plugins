// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ThresholdOptions } from '@perses-dev/core';
import { PersesChartsTheme } from '@perses-dev/components';

export function getColorFromThresholds(
  value: number,
  thresholds: ThresholdOptions | undefined,
  chartsTheme: PersesChartsTheme,
  defaultColor: string
): string | null {
  if (thresholds?.steps) {
    const matchingColors = thresholds.steps
      .map((step, index) => {
        if (value >= step.value) {
          return step.color ?? chartsTheme.thresholds.palette[index] ?? thresholds.defaultColor ?? defaultColor;
        }
        return null;
      })
      .filter((color): color is string => color !== null);

    return matchingColors[matchingColors.length - 1] ?? thresholds.defaultColor ?? defaultColor;
  }
  return thresholds?.defaultColor ?? defaultColor;
}
