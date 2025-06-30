// Copyright 2025 The Perses Authors
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

import { otlptracev1 } from '@perses-dev/core';
import * as otlpTrace from '../../test/traces/example_otlp.json';
import { getFilename } from './Toolbar';

describe('Toolbar', () => {
  it('renders trace filename', () => {
    expect(getFilename(otlpTrace as otlptracev1.TracesData)).toEqual('5B8EFFF798038103D269B633813FC60C.json');
  });

  it('converts trace id to hex', () => {
    const tempoTrace = JSON.parse(JSON.stringify(otlpTrace)) as otlptracev1.TracesData;
    tempoTrace.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.traceId = 'H/fxkmfXvuMjrQgJgsFKzw==';
    expect(getFilename(tempoTrace)).toEqual('1ff7f19267d7bee323ad080982c14acf.json');
  });
});
