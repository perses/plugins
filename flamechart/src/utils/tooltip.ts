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
import { Sample } from '../components/FlameChart';
import { formatValue } from './format';

/**
 * Generates a tooltip for the flame chart samples.
 */
export function generateTooltip(params: Sample, unit: string | undefined): string {
  const tooltip = `${params.value[6]}<br/><br/>
            Total: ${formatValue(unit, Number(params.value[8]))} (${Number(params.value[4]).toFixed(2)}%)<br/>
            Self: ${formatValue(unit, Number(params.value[7]))} (${Number(params.value[5]).toFixed(2)}%)<br/>
            Samples: ${echarts.format.addCommas(Number(params.value[8]))}`;
  return tooltip;
}
