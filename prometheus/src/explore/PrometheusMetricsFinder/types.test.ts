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

import { computeFilterExpr } from './types';

describe('computeFilterExpr', () => {
  it('should join the values of a regex filter', () => {
    expect(computeFilterExpr([{ label: 'job', labelValues: ['api', 'web'], operator: '=~' }])).toEqual(
      'job=~"api|web"',
    );
  });

  it('should join several filters', () => {
    expect(
      computeFilterExpr([
        { label: 'job', labelValues: ['api'], operator: '=' },
        { label: 'env', labelValues: ['dev'], operator: '!=' },
      ]),
    ).toEqual('job="api",env!="dev"');
  });

  it('should escape double quotes, backslashes and line breaks in label values', () => {
    expect(computeFilterExpr([{ label: 'path', labelValues: ['C:\\data "x"'], operator: '=' }])).toEqual(
      'path="C:\\\\data \\"x\\""',
    );
    expect(computeFilterExpr([{ label: 'code', labelValues: ['\\d+', 'a\nb'], operator: '=~' }])).toEqual(
      'code=~"\\\\d+|a\\nb"',
    );
  });
});
