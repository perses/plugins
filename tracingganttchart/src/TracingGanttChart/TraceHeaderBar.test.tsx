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

import { render, RenderResult } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';
import * as exampleTrace from '../test/traces/example_otlp.json';
import { getTraceModel } from './trace';
import { TraceHeaderBar, TraceHeaderBarProps } from './TraceHeaderBar';
import { SpanSearch } from './Search';

describe('TraceHeaderBar', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const search: SpanSearch = {
    searchQuery: '',
    setSearchQuery: () => {},
    matchingSpanIds: [],
    focusedMatchIndex: 0,
    setFocusedMatchIndex: () => {},
  };
  const renderComponent = (props: TraceHeaderBarProps): RenderResult => {
    return render(
      <MemoryRouter>
        <TraceHeaderBar {...props} />
      </MemoryRouter>
    );
  };

  it('render trace details', () => {
    renderComponent({ trace, search });
    expect(screen.getByRole('heading', { name: 'shop-backend: testRootSpan (1s)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trace ID: 5B8EFFF798038103D269B633813FC60C/ })).toBeInTheDocument();
  });
});
