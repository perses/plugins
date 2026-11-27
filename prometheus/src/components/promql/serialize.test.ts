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

import type ASTNode from './ast';
import { aggregationType, matchType, nodeType } from './ast';
import serializeNode from './serialize';

const selector = (name: string, matchers: Array<{ name: string; value: string }> = []): ASTNode => ({
  type: nodeType.vectorSelector,
  name,
  matchers: matchers.map((m) => ({ ...m, type: matchType.equal })),
  offset: 0,
  timestamp: null,
  startOrEnd: null,
});

describe('serializeNode', () => {
  it('should keep legacy metric and label names unquoted', () => {
    expect(serializeNode(selector('http_requests_total', [{ name: 'job', value: 'api' }]))).toEqual(
      'http_requests_total{job="api"}',
    );
  });

  it('should quote metric and label names outside the legacy character set', () => {
    expect(serializeNode(selector('http.requests', [{ name: 'service.name', value: 'api' }]))).toEqual(
      '{"http.requests","service.name"="api"}',
    );
  });

  it('should quote grouping labels outside the legacy character set', () => {
    expect(
      serializeNode({
        type: nodeType.aggregation,
        op: aggregationType.sum,
        expr: selector('up'),
        param: null,
        grouping: ['job', 'service.name'],
        without: false,
      }),
    ).toEqual('sum by(job, "service.name") (up)');
  });
});
