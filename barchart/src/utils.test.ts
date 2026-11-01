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

import type { BarChartData } from './BarChartBase';
import {
  barLinkHref,
  calculatePercentages,
  fieldLinkParams,
  getOverrideColor,
  sortSeriesData,
  withLiveDashboardVars,
  withLocationTime,
} from './utils';

const MOCK_DATA: BarChartData[] = [
  {
    label: 'Label 1',
    value: 3,
  },
  {
    label: 'Label 2',
    value: 2,
  },
  {
    label: 'Label 3',
    value: 0,
  },
  {
    label: 'Label 4',
    value: 5,
  },
  {
    label: 'Label 5',
    value: null,
  },
];

describe('barLinkHref', () => {
  const template =
    '/projects/perses/dashboards/nodes?var-instance=${__field.labels.instance}&var-job=$job&var-namespace=$namespace';

  it('fills the series label and the dashboard variables', () => {
    const href = barLinkHref(template, { instance: 'node-a' }, { job: { value: 'demo', loading: false } });
    expect(href).toContain('var-instance=node-a');
    expect(href).toContain('var-job=demo');
    expect(href).toContain('var-namespace=$namespace');
    expect(href).not.toContain('__field');
  });

  it('keeps All as $__all', () => {
    const href = barLinkHref(
      '/projects/perses/dashboards/nodes?var-namespace=$namespace&var-job=${job:csv}',
      {},
      {
        namespace: { value: '$__all', loading: false, customAllValue: '.*' },
        job: { value: ['demo'], loading: false },
      },
    );
    expect(href).toContain('var-namespace=$__all');
    expect(href).toContain('var-job=demo');
    expect(href).not.toContain('.*');
  });

  it('names the field-label query params', () => {
    expect(fieldLinkParams(template)).toEqual(['var-instance']);
  });

  it('prefers the address bar and keeps the series label', () => {
    const href = withLiveDashboardVars(
      '/projects/perses/dashboards/nodes?var-instance=node-a&var-namespace=.*&var-job=(demo)&var-pod=.*',
      '?var-instance=other&var-namespace=$__all&var-job=demo&start=1h',
      fieldLinkParams(template),
    );
    expect(href).toContain('var-instance=node-a');
    expect(href).toContain('var-namespace=$__all');
    expect(href).toContain('var-job=demo');
    expect(href).toContain('var-pod=$__all');
    expect(href).not.toContain('.*');
    expect(href).not.toContain('other');
  });

  it('keeps the current time range', () => {
    expect(withLocationTime('/projects/perses/dashboards/nodes?var-instance=node-a', '?start=1h&tz=UTC')).toBe(
      '/projects/perses/dashboards/nodes?var-instance=node-a&start=1h&tz=UTC',
    );
  });
});

describe('calculatePercentages', () => {
  it('calculates correct percentage values', () => {
    const percentages = calculatePercentages(MOCK_DATA);
    expect(percentages).toEqual([
      {
        label: 'Label 1',
        value: 30,
      },
      {
        label: 'Label 2',
        value: 20,
      },
      {
        label: 'Label 3',
        value: 0,
      },
      {
        label: 'Label 4',
        value: 50,
      },
      {
        label: 'Label 5',
        value: 0,
      },
    ]);
  });
});

describe('sortSeriesData', () => {
  it('sorts in ascending order', () => {
    const sorted = sortSeriesData(MOCK_DATA, 'asc');
    expect(sorted).toEqual([
      {
        label: 'Label 4',
        value: 5,
      },
      {
        label: 'Label 1',
        value: 3,
      },
      {
        label: 'Label 2',
        value: 2,
      },
      {
        label: 'Label 3',
        value: 0,
      },
      {
        label: 'Label 5',
        value: null,
      },
    ]);
  });

  it('sorts in descending order', () => {
    const sorted = sortSeriesData(MOCK_DATA, 'desc');
    expect(sorted).toEqual([
      {
        label: 'Label 5',
        value: null,
      },
      {
        label: 'Label 3',
        value: 0,
      },
      {
        label: 'Label 2',
        value: 2,
      },
      {
        label: 'Label 1',
        value: 3,
      },
      {
        label: 'Label 4',
        value: 5,
      },
    ]);
  });
});

describe('getOverrideColor', () => {
  it('returns the color of the first matching override', () => {
    const color = getOverrideColor('errors_total', [
      { regex: 'errors', color: '#ff0000' },
      { regex: 'total', color: '#00ff00' },
    ]);
    expect(color).toBe('#ff0000');
  });

  it('returns undefined when no override matches', () => {
    const color = getOverrideColor('latency', [{ regex: 'errors', color: '#ff0000' }]);
    expect(color).toBeUndefined();
  });

  it('returns undefined when overrides is undefined', () => {
    expect(getOverrideColor('errors')).toBeUndefined();
  });

  it('ignores invalid regex and continues to the next override', () => {
    const color = getOverrideColor('errors_total', [
      { regex: '[', color: '#ff0000' },
      { regex: 'errors', color: '#00ff00' },
    ]);
    expect(color).toBe('#00ff00');
  });

  it('ignores empty regex and continues to the next override', () => {
    const color = getOverrideColor('errors_total', [
      { regex: '', color: '#ff0000' },
      { regex: 'errors', color: '#00ff00' },
    ]);
    expect(color).toBe('#00ff00');
  });

  it('ignores empty regex and falls back to undefined if no other overrides match', () => {
    const color = getOverrideColor('latency', [
      { regex: '', color: '#ff0000' },
      { regex: 'errors', color: '#00ff00' },
    ]);
    expect(color).toBeUndefined();
  });
});
