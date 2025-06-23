import React from 'react';
// eslint-disable-next-line storybook/no-renderer-packages
import { Meta, StoryFn } from '@storybook/react';
import { ChartsProvider } from '@perses-dev/components';
import { HistogramChart } from './HistogramChart';

export default {
  title: 'Components/HistogramChart',
  component: HistogramChart,
} as Meta;

const Template: StoryFn<React.ComponentProps<typeof HistogramChart>> = (
  args: React.ComponentProps<typeof HistogramChart>
) => (
  <ChartsProvider
    chartsTheme={{
      echartsTheme: {},
      noDataOption: {},
      sparkline: {
        width: 2,
        color: '#FF0000',
      },
      container: {
        padding: {
          default: 0,
        },
      },
      thresholds: {
        defaultColor: '#000000',
        palette: ['#FF0000', '#00FF00', '#0000FF'],
      },
    }}
  >
    <HistogramChart {...args} />
  </ChartsProvider>
);

export const SAMPLE_INCOME_IN_FIRM = Template.bind({});

SAMPLE_INCOME_IN_FIRM.args = {
  width: 800,
  height: 400,
  exponential: { base: 2 },
  data: {
    buckets: [
      [0, '500', '1000', '20'],
      [1, '1000', '1500', '200'],
      [2, '1500', '2000', '350'],
      [3, '2000', '2500', '300'],
      [4, '2500', '3000', '250'],
      [5, '3000', '3500', '200'],
      [6, '3500', '4000', '100'],
      [7, '4000', '4500', '20'],
      [8, '4500', '5000', '2'],
      [9, '5000', '5500', '5'],
    ],
  },
  format: { unit: 'decimal', decimalPlaces: 2 },
};

export const SAMPLE_NETWORK_RESPONSE_TIME = Template.bind({});

SAMPLE_NETWORK_RESPONSE_TIME.args = {
  width: 800,
  height: 400,
  exponential: { base: 2 },
  data: {
    buckets: [
      [0, '0', '50', '20'],
      [1, '50', '100', '13'],
      [2, '100', '150', '15'],
      [3, '150', '200', '0'],
      [4, '200', '250', '0'],
      [5, '250', '300', '0'],
      [6, '350', '400', '0'],
    ],
  },
  format: { unit: 'decimal', decimalPlaces: 2 },
};
