import { StepOptions, ThresholdColorPalette, ThresholdOptions, FormatOptions } from '@perses-dev/core';
import zip from 'lodash/zip';

export type GaugeColorStop = [number, string];

export type EChartsAxisLineColors = GaugeColorStop[];

export const defaultThresholdInput: ThresholdOptions = { steps: [{ value: 0 }] };

export function convertThresholds(
  thresholds: ThresholdOptions,
  unit: FormatOptions,
  max: number,
  palette: ThresholdColorPalette
): EChartsAxisLineColors {
  const defaultThresholdColor = thresholds.defaultColor ?? palette.defaultColor;
  const defaultThresholdSteps: EChartsAxisLineColors = [[0, defaultThresholdColor]];

  if (thresholds.steps !== undefined) {
    // https://echarts.apache.org/en/option.html#series-gauge.axisLine.lineStyle.color
    // color segments must be decimal between 0 and 1
    const segmentMax = 1;
    const valuesArr: number[] = thresholds.steps.map((step: StepOptions) => {
      if (thresholds.mode === 'percent') {
        return step.value / 100;
      }
      return step.value / max;
    });
    valuesArr.push(segmentMax);

    const colorsArr = thresholds.steps.map((step: StepOptions, index) => step.color ?? palette.palette[index]);
    colorsArr.unshift(defaultThresholdColor);

    const zippedArr = zip(valuesArr, colorsArr);
    return zippedArr.map((elem) => {
      const convertedValues = elem[0] ?? segmentMax;
      const convertedColors = elem[1] ?? defaultThresholdColor;
      return [convertedValues, convertedColors];
    });
  } else {
    return defaultThresholdSteps;
  }
}
