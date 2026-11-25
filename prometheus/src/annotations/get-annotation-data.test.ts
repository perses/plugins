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

import type { AnnotationContext } from '@perses-dev/plugin-system';
import type { DatasourceSpec } from '@perses-dev/spec';
import type { Mock } from 'vitest';

import type { RangeQueryResponse } from '../model';
import { PrometheusDatasource } from '../plugins/prometheus-datasource';
import type { PrometheusDatasourceSpec } from '../plugins/types';
import { getAnnotationData, getAnnotationEvents } from './get-annotation-data';

const datasource: PrometheusDatasourceSpec = {
  directUrl: '/test',
  scrapeInterval: '15s',
};

const promStubClient = PrometheusDatasource.createClient(datasource, {});

// 2023-01-01T00:00:00Z, the time range starts there and lasts one hour, so the step of the range query is 15s.
const start = 1672531200;

const getDatasource: Mock = vi.fn(async (): Promise<DatasourceSpec<PrometheusDatasourceSpec>> => ({
  default: false,
  plugin: { kind: 'PrometheusDatasource', spec: datasource },
}));

const getDatasourceClient: Mock = vi.fn(async () => promStubClient);

function createStubContext(): AnnotationContext {
  return {
    datasourceStore: {
      getDatasource: getDatasource,
      getDatasourceClient: getDatasourceClient,
      listDatasourceSelectItems: vi.fn(),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
    absoluteTimeRange: {
      start: new Date(start * 1000),
      end: new Date((start + 3600) * 1000),
    },
    variableState: {},
  };
}

function mockRangeQueryResult(result: RangeQueryResponse): void {
  promStubClient.rangeQuery = vi.fn(async () => result);
}

describe('getAnnotationEvents', () => {
  it('should return no event for a series without sample', () => {
    expect(getAnnotationEvents([], 15)).toEqual([]);
  });

  it('should return a point for a single sample', () => {
    expect(getAnnotationEvents([[start, '1']], 15)).toEqual([{ start: start * 1000 }]);
  });

  it('should return a region for consecutive samples', () => {
    expect(
      getAnnotationEvents(
        [
          [start, '1'],
          [start + 15, '1'],
          [start + 30, '1'],
        ],
        15,
      ),
    ).toEqual([{ start: start * 1000, end: (start + 30) * 1000 }]);
  });

  it('should start a new event after a gap in the series', () => {
    expect(
      getAnnotationEvents(
        [
          [start, '1'],
          [start + 15, '1'],
          [start + 60, '1'],
          [start + 120, '1'],
          [start + 135, '1'],
        ],
        15,
      ),
    ).toEqual([
      { start: start * 1000, end: (start + 15) * 1000 },
      { start: (start + 60) * 1000 },
      { start: (start + 120) * 1000, end: (start + 135) * 1000 },
    ]);
  });

  it('should not split the samples that are exactly one step apart', () => {
    expect(
      getAnnotationEvents(
        [
          [start, '1'],
          [start + 60, '1'],
          [start + 120, '1'],
        ],
        60,
      ),
    ).toEqual([{ start: start * 1000, end: (start + 120) * 1000 }]);
  });

  it('should not split the samples of a sub-second step because of floating point errors', () => {
    expect(
      getAnnotationEvents(
        [
          [1672531200.72, '1'],
          [1672531201.08, '1'],
          [1672531201.44, '1'],
        ],
        0.36,
      ),
    ).toEqual([{ start: 1672531200720, end: 1672531201440 }]);
  });
});

describe('getAnnotationData', () => {
  it('should return no annotation when the expression is empty', async () => {
    mockRangeQueryResult({ status: 'success', data: { resultType: 'matrix', result: [] } });
    const ctx = createStubContext();

    expect(await getAnnotationData({ expr: '' }, ctx)).toEqual([]);
    expect(promStubClient.rangeQuery).not.toHaveBeenCalled();
  });

  it('should create one annotation per event of each series, in milliseconds', async () => {
    mockRangeQueryResult({
      status: 'success',
      data: {
        resultType: 'matrix',
        result: [
          {
            metric: { deployment: 'api', namespace: 'prod' },
            values: [
              [start + 600, '1'],
              [start + 1800, '1'],
              [start + 1815, '1'],
            ],
          },
          {
            metric: { deployment: 'web', namespace: 'prod' },
            values: [[start + 900, '1']],
          },
          {
            metric: { deployment: 'db', namespace: 'prod' },
            values: [],
          },
        ],
      },
    });

    const annotations = await getAnnotationData(
      { expr: 'changes(deployment_generation[1m]) > 0', title: 'Deployment of {{deployment}}', tags: ['deployment'] },
      createStubContext(),
    );

    expect(promStubClient.rangeQuery).toHaveBeenCalledWith(
      expect.objectContaining({ start: start, end: start + 3600, step: 15 }),
      expect.anything(),
    );
    expect(annotations).toEqual([
      {
        start: (start + 600) * 1000,
        title: 'Deployment of api',
        legend: undefined,
        tags: { deployment: 'api' },
      },
      {
        start: (start + 1800) * 1000,
        end: (start + 1815) * 1000,
        title: 'Deployment of api',
        legend: undefined,
        tags: { deployment: 'api' },
      },
      {
        start: (start + 900) * 1000,
        title: 'Deployment of web',
        legend: undefined,
        tags: { deployment: 'web' },
      },
    ]);
    expect(annotations[0]).not.toHaveProperty('end');
  });
});
