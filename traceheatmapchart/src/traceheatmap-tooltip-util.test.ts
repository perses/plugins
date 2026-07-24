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

import { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { createBucketToolTip, ToolTipChartData } from './traceheatmap-tooltip-util';

const mockData = {
  params: {
    value: [0, 5, 2],
  },
  toolTipChartData: {
    bucketCountMap: [
      [0, 1, 0, 0, 1, 2, 0, 0, 0, 1, 0],
      [1, 0, 0, 1, 2, 2, 0, 1, 0, 3, 0],
      [0, 0, 0, 1, 2, 0, 1, 1, 0, 0, 0],
    ],
    bucketToFlatResultsMap: [
      [[], [15], [], [], [17], [16, 19], [], [], [], [18], []],
      [[8], [], [], [14], [6, 11], [5, 10], [], [13], [], [7, 9, 12], []],
      [[], [], [], [2], [0, 4], [], [3], [1], [], [], []],
    ],
    durationBuckets: [
      {
        start: 8,
        label: '8 ms',
      },
      {
        start: 16,
        label: '16 ms',
      },
      {
        start: 32,
        label: '32 ms',
      },
      {
        start: 64,
        label: '64 ms',
      },
      {
        start: 128,
        label: '128 ms',
      },
      {
        start: 256,
        label: '256 ms',
      },
      {
        start: 512,
        label: '512 ms',
      },
      {
        start: 1024,
        label: '1024 ms',
      },
      {
        start: 2048,
        label: '2048 ms',
      },
      {
        start: 4096,
        label: '4096 ms',
      },
      {
        start: 8192,
        label: '8192 ms',
      },
    ],
    timeBuckets: [
      {
        startTimestamp: 1784540414538.0178,
        label: '11:40-11:41',
      },
      {
        startTimestamp: 1784540474538.0178,
        label: '11:41-11:42',
      },
      {
        startTimestamp: 1784540534538.0178,
        label: '11:42-11:43',
      },
    ],
    flatResults: [
      {
        startTimeUnixMs: 1784540566155.6975,
        durationMs: 150,
      },
      {
        // eslint-disable-next-line no-loss-of-precision
        startTimeUnixMs: 1784540562271.2812,
        durationMs: 2000,
      },
      {
        startTimeUnixMs: 1784540562188.8926,
        durationMs: 81,
      },
      {
        startTimeUnixMs: 1784540540915.67,
        durationMs: 900,
      },
      {
        startTimeUnixMs: 1784540538764.3755,
        durationMs: 150,
      },
      {
        startTimeUnixMs: 1784540533028.299,
        durationMs: 400,
      },
      {
        startTimeUnixMs: 1784540503971.5842,
        durationMs: 150,
      },
      {
        startTimeUnixMs: 1784540498970.7666,
        durationMs: 5000,
      },
      {
        startTimeUnixMs: 1784540498960.0603,
        durationMs: 10,
      },
      {
        startTimeUnixMs: 1784540493838.0383,
        durationMs: 5000,
      },
      {
        startTimeUnixMs: 1784540492564.4324,
        durationMs: 400,
      },
      {
        startTimeUnixMs: 1784540486921.2476,
        durationMs: 150,
      },
      {
        startTimeUnixMs: 1784540481716.7546,
        durationMs: 5001,
      },
      {
        startTimeUnixMs: 1784540479520.5488,
        durationMs: 2001,
      },
      {
        startTimeUnixMs: 1784540479439.648,
        durationMs: 80,
      },
      {
        startTimeUnixMs: 1784540458808.4639,
        durationMs: 31,
      },
      {
        startTimeUnixMs: 1784540432018.206,
        durationMs: 400,
      },
      {
        startTimeUnixMs: 1784540431867.385,
        durationMs: 150,
      },
      {
        startTimeUnixMs: 1784540414938.3296,
        durationMs: 5000,
      },
      {
        startTimeUnixMs: 1784540414538.0178,
        durationMs: 400,
      },
    ],
  },
};

describe('traceheatmap-tooltip-util', () => {
  it('should create a tooltip with all elements', () => {
    const { params, toolTipChartData } = mockData;
    const toolTip = createBucketToolTip(params as TopLevelFormatterParams, toolTipChartData as ToolTipChartData);
    const container = document.createElement('div');
    container.setAttribute('id', 'test-container');
    container.innerHTML = toolTip;
    const [column, row] = params.value;
    ['time', 'duration', 'traces', 'shared', 'min', 'max'].forEach((element) => {
      const id = `bucket-${column}-${row}-tooltip-${element}`;
      console.log(id);
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    });
  });
});
