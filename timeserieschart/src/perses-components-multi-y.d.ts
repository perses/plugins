// Published @perses-dev/components does not export this yet. The signature
// matches shared#321 so this plugin typechecks until that release.
import type { YAXisComponentOption } from 'echarts';
import type { FormatOptions } from '@perses-dev/components';

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
