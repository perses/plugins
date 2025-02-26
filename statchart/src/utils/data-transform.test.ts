// Copyright 2023 The Perses Authors
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

import { testChartsTheme } from '@perses-dev/components';
import { ThresholdOptions } from '@perses-dev/core';
import { LineSeriesOption } from 'echarts';
import { StatChartOptions, StatChartSparklineOptions } from '../stat-chart-model';
import { convertSparkline } from './data-transform';
import { getStatChartColor } from './get-color';

const thresholds: ThresholdOptions = {
  steps: [
    {
      color: 'yellow',
      value: 10,
    },
    {
      color: 'orange',
      value: 20,
    },
    {
      color: 'red',
      value: 30,
    },
  ],
};

describe('getStatChartColor', () => {
  describe('if threshold is not met', () => {
    it('should return thresholds.defaultColor if defined', () => {
      const defaultColor = 'purple';
      const testSpec = {
        thresholds: { ...thresholds, defaultColor },
      } as StatChartOptions;
      const value = getStatChartColor(testChartsTheme, testSpec, 5);
      expect(value).toEqual(defaultColor);
    });

    it('should return charts theme default threshold color if thresholds.defaultColor is undefined', () => {
      const testSpec = {
        thresholds,
      } as StatChartOptions;
      const value = getStatChartColor(testChartsTheme, testSpec, 5);
      expect(value).toEqual(testChartsTheme.thresholds.defaultColor);
    });
  });

  it('should return orange if value meets the threshold', () => {
    const testSpec = {
      thresholds,
    } as StatChartOptions;
    const value = getStatChartColor(testChartsTheme, testSpec, 25);
    expect(value).toEqual('orange');
  });
});

describe('convertSparkline', () => {
  const sparkline: StatChartSparklineOptions = {
    color: 'purple',
  };

  it('should render charts theme default threshold color', () => {
    testChartsTheme.thresholds.defaultColor = 'green';
    const options = convertSparkline(testChartsTheme, 'green', sparkline) as LineSeriesOption;
    expect(options.lineStyle?.color).toEqual('green');
    expect(options.areaStyle?.color).toEqual('green');
  });

  it('should render threshold default color if threshold is not met ', () => {
    const defaultColor = 'purple';
    const options = convertSparkline(testChartsTheme, defaultColor, sparkline) as LineSeriesOption;
    expect(options.lineStyle?.color).toEqual(defaultColor);
    expect(options.areaStyle?.color).toEqual(defaultColor);
  });

  it('should render orange if value meets the threshold', () => {
    const defaultColor = 'orange';
    const options = convertSparkline(testChartsTheme, defaultColor, sparkline) as LineSeriesOption;
    expect(options.lineStyle?.color).toEqual(defaultColor);
    expect(options.areaStyle?.color).toEqual(defaultColor);
  });
});
