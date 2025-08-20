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

import { render, RenderResult } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { otlptracev1 } from '@perses-dev/core';
import * as exampleTrace from '../test/traces/example_otlp.json';
import { getTraceModel } from './trace';
import { TraceDetails, TraceDetailsProps } from './TraceDetails';

describe('TraceDetails', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const renderComponent = (props: TraceDetailsProps): RenderResult => {
    return render(
      <MemoryRouter>
        <TraceDetails {...props} />
      </MemoryRouter>
    );
  };

  it('render trace details', () => {
    renderComponent({ trace });
    expect(screen.getByRole('heading', { name: 'shop-backend: testRootSpan (1s)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trace ID: 5B8EFFF798038103D269B633813FC60C/ })).toBeInTheDocument();
  });
});
