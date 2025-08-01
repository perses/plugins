// Copyright 2024 The Perses Authors
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

import { screen } from '@testing-library/dom';
import { render, RenderResult } from '@testing-library/react';
import { otlptracev1 } from '@perses-dev/core';
import * as otlpTrace from '../test/traces/example_otlp.json';
import { TicksHeader, TicksHeaderProps } from './Ticks';
import { getTraceModel } from './trace';

describe('Ticks', () => {
  const trace = getTraceModel(otlpTrace as otlptracev1.TracesData);
  const renderComponent = (props: TicksHeaderProps): RenderResult => {
    return render(<TicksHeader {...props} />);
  };

  it('render <TicksHeader>', () => {
    renderComponent({
      trace,
      viewport: { startTimeUnixMs: trace.startTimeUnixMs, endTimeUnixMs: trace.endTimeUnixMs },
    });
    expect(screen.getByText('0μs')).toBeInTheDocument();
    expect(screen.getByText('250ms')).toBeInTheDocument();
    expect(screen.getByText('500ms')).toBeInTheDocument();
    expect(screen.getByText('750ms')).toBeInTheDocument();
    expect(screen.getByText('1s')).toBeInTheDocument();
  });
});
