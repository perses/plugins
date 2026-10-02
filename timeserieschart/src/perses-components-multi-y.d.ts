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

import type { FormatOptions } from '@perses-dev/components';
import type { YAXisComponentOption } from 'echarts';

// Published @perses-dev/components does not export this yet. The signature
// matches shared#321 so this plugin typechecks until that release.
declare module '@perses-dev/components' {
  export function getFormattedMultipleYAxesLayout(
    baseAxis: YAXisComponentOption | undefined,
    baseFormat: FormatOptions | undefined,
    additionalFormats: FormatOptions[],
    maxValues?: number[],
  ): {
    axes: YAXisComponentOption[];
    rightGridPadding: number;
  };
}
