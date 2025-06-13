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
