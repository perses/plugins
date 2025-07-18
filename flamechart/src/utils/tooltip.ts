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

import * as echarts from 'echarts';
import { FlameChartSample } from './data-model';
import { formatItemValue } from './format';

/**
 * Generates a tooltip for the flame chart items.
 */
export function generateTooltip(params: FlameChartSample, unit: string | undefined): string {
  const totalPercentage = Number(params.value[4]);
  const selfPercentage = Number(params.value[5]);
  const functionName = params.value[6];
  const total = Number(params.value[8]);
  const self = Number(params.value[7]);

  return `${functionName}<br/><br/>
            Total: ${formatItemValue(unit, total)} (${totalPercentage.toFixed(2)}%)<br/>
            Self: ${formatItemValue(unit, self)} (${selfPercentage.toFixed(2)}%)<br/>
            Samples: ${echarts.format.addCommas(total)}`;
}
