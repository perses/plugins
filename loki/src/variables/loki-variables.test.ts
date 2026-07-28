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

import { GetVariableOptionsContext } from '@perses-dev/plugin-system';
import { LokiStreamResult } from '../model/loki-client-types';
import { stringArrayToVariableOptions, capturingMetric, capturingStreams } from './loki-variables';
import { LokiLabelValuesVariable } from './LokiLabelValuesVariable';
import { LokiLabelNamesVariable } from './LokiLabelNamesVariable';
import { LokiLogQLVariable } from './LokiLogQLVariable';

// Dummy context for dependsOn calls (the implementations don't use ctx)
const dummyCtx = {} as GetVariableOptionsContext;

describe('stringArrayToVariableOptions', () => {
  it('converts a string array to VariableOption array', () => {
    const result = stringArrayToVariableOptions(['foo', 'bar', 'baz']);
    expect(result).toEqual([
      { value: 'foo', label: 'foo' },
      { value: 'bar', label: 'bar' },
      { value: 'baz', label: 'baz' },
    ]);
  });

  it('returns empty array for undefined input', () => {
    const result = stringArrayToVariableOptions(undefined);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    const result = stringArrayToVariableOptions([]);
    expect(result).toEqual([]);
  });
});

describe('capturingMetric', () => {
  it('extracts unique label values from results with metric field', () => {
    const results = [
      { metric: { job: 'app1', instance: 'host1' } },
      { metric: { job: 'app2', instance: 'host2' } },
      { metric: { job: 'app1', instance: 'host3' } },
    ];
    const values = capturingMetric(results, 'job');
    expect(values).toEqual(['app1', 'app2']);
  });

  it('returns empty array when label is not present', () => {
    const results = [{ metric: { job: 'app1' } }];
    const values = capturingMetric(results, 'missing');
    expect(values).toEqual([]);
  });

  it('handles empty results', () => {
    const values = capturingMetric([], 'job');
    expect(values).toEqual([]);
  });
});

describe('capturingStreams', () => {
  it('extracts unique label values from LokiStreamResult array', () => {
    const results: LokiStreamResult[] = [
      { stream: { job: 'svc-a', namespace: 'prod' }, values: [['1000', 'log line 1']] },
      { stream: { job: 'svc-b', namespace: 'staging' }, values: [['1001', 'log line 2']] },
      { stream: { job: 'svc-a', namespace: 'dev' }, values: [['1002', 'log line 3']] },
    ];
    const values = capturingStreams(results, 'job');
    expect(values).toEqual(['svc-a', 'svc-b']);
  });

  it('returns empty array when label is not present in any stream', () => {
    const results: LokiStreamResult[] = [{ stream: { job: 'svc-a' }, values: [['1000', 'log line 1']] }];
    const values = capturingStreams(results, 'nonexistent');
    expect(values).toEqual([]);
  });

  it('handles empty results', () => {
    const values = capturingStreams([], 'job');
    expect(values).toEqual([]);
  });
});

describe('LokiLabelValuesVariable.dependsOn', () => {
  it('returns variable dependencies from labelName and matchers', () => {
    const spec = {
      labelName: '$env',
      matchers: ['{job="$app"}', '{namespace="$ns"}'],
    };
    const result = LokiLabelValuesVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toContain('env');
    expect(result.variables).toContain('app');
    expect(result.variables).toContain('ns');
  });

  it('returns label variable when no matchers', () => {
    const spec = { labelName: '$myLabel' };
    const result = LokiLabelValuesVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toContain('myLabel');
  });

  it('includes datasource variable dependencies', () => {
    const spec = { labelName: 'job', datasource: '$lokiDS' };
    const result = LokiLabelValuesVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toContain('lokiDS');
  });

  it('returns empty array for no variable references', () => {
    const spec = { labelName: 'job' };
    const result = LokiLabelValuesVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toEqual([]);
  });
});

describe('LokiLabelNamesVariable.dependsOn', () => {
  it('returns variable dependencies from matchers', () => {
    const spec = { matchers: ['{job="$app"}'] };
    const result = LokiLabelNamesVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toContain('app');
  });

  it('includes datasource variable dependencies', () => {
    const spec = { datasource: '$lokiDS' };
    const result = LokiLabelNamesVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toContain('lokiDS');
  });

  it('returns empty array when no variable references', () => {
    const spec = {};
    const result = LokiLabelNamesVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toEqual([]);
  });
});

describe('LokiLogQLVariable.dependsOn', () => {
  it('returns variable dependencies from expr and labelName', () => {
    const spec = { expr: '{job="$app"} | logfmt', labelName: '$field' };
    const result = LokiLogQLVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toContain('app');
    expect(result.variables).toContain('field');
  });

  it('includes datasource variable dependencies', () => {
    const spec = { expr: '{job="test"}', labelName: 'level', datasource: '$lokiDS' };
    const result = LokiLogQLVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toContain('lokiDS');
  });

  it('returns empty array when no variable references', () => {
    const spec = { expr: '{job="test"}', labelName: 'level' };
    const result = LokiLogQLVariable.dependsOn!(spec, dummyCtx);
    expect(result.variables).toEqual([]);
  });
});
