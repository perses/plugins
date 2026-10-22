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

import type { VariableStateMap } from '@perses-dev/components';
import type { GetVariableOptionsContext } from '@perses-dev/plugin-system';
import type { DatasourceSpec } from '@perses-dev/spec';
import type { Mock } from 'vitest';

import { PrometheusDatasource } from './prometheus-datasource';
import { PrometheusLabelValuesVariable } from './PrometheusLabelValuesVariable';
import type { PrometheusDatasourceSpec } from './types';

const datasource: PrometheusDatasourceSpec = { directUrl: 'http://localhost:9090' };

const fetchJson = vi.fn();
const client = PrometheusDatasource.createClient(datasource, { fetchJson });

const getDatasource: Mock = vi.fn(async (): Promise<DatasourceSpec<PrometheusDatasourceSpec>> => {
  return {
    default: false,
    plugin: { kind: 'PrometheusDatasource', spec: datasource },
  };
});
const getDatasourceClient: Mock = vi.fn(async () => client);

function createContext(variables: VariableStateMap = {}): GetVariableOptionsContext {
  return {
    datasourceStore: {
      getDatasource,
      getDatasourceClient,
      listDatasourceSelectItems: vi.fn(async () => []),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
    variables,
    timeRange: { start: new Date('2023-01-01T00:00:00Z'), end: new Date('2023-01-01T01:00:00Z') },
  };
}

// The `match[]` values of the only label values request sent to Prometheus.
function sentMatchers(): string[] {
  expect(fetchJson).toHaveBeenCalledTimes(1);
  const [url] = fetchJson.mock.lastCall as [string];
  return new URL(url).searchParams.getAll('match[]');
}

describe('PrometheusLabelValuesVariable', () => {
  beforeEach(() => {
    fetchJson.mockReset();
    fetchJson.mockResolvedValue({ status: 'success', data: ['node', 'prometheus'] });
  });

  it('should not send match[] when the variable has no series selector', async () => {
    const { data } = await PrometheusLabelValuesVariable.getVariableOptions({ labelName: 'job' }, createContext());

    expect(sentMatchers()).toEqual([]);
    expect(data).toEqual([
      { value: 'node', label: 'node' },
      { value: 'prometheus', label: 'prometheus' },
    ]);
  });

  it('should not send empty series selectors to Prometheus', async () => {
    const { data } = await PrometheusLabelValuesVariable.getVariableOptions(
      { labelName: 'job', matchers: ['', '  ', '\t\n'] },
      createContext(),
    );

    expect(sentMatchers()).toEqual([]);
    expect(data).toEqual([
      { value: 'node', label: 'node' },
      { value: 'prometheus', label: 'prometheus' },
    ]);
  });

  it('should interpolate the series selectors and send the non-empty ones unchanged', async () => {
    // Prometheus accepts whitespace around a selector, so the non-empty selectors are not trimmed.
    await PrometheusLabelValuesVariable.getVariableOptions(
      { labelName: 'job', matchers: [' up{job="$job"} ', '', 'go_info'] },
      createContext({ job: { value: 'node', loading: false } }),
    );

    expect(sentMatchers()).toEqual([' up{job="node"} ', 'go_info']);
  });

  it('should not send a series selector that interpolates to an empty string', async () => {
    await PrometheusLabelValuesVariable.getVariableOptions(
      { labelName: 'job', matchers: ['$selector'] },
      createContext({ selector: { value: '', loading: false } }),
    );

    expect(sentMatchers()).toEqual([]);
  });
});
