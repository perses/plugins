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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { PrometheusDatasourceEditor } from './PrometheusDatasourceEditor';
import type { PrometheusDatasourceSpec, PrometheusExemplarLinkSpec } from './types';

const link: PrometheusExemplarLinkSpec = {
  name: 'Jaeger',
  url: 'http://localhost:16686/trace/${traceId}',
  traceIDLabel: 'trace_id',
};

// The HTTP settings of the editor are bound to the form of the datasource.
function FormWrapper({ children }: { children: ReactNode }): ReactElement {
  const form = useForm();
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe('PrometheusDatasourceEditor exemplars', () => {
  const onChange = vi.fn();

  const renderEditor = (value: PrometheusDatasourceSpec): void => {
    render(<PrometheusDatasourceEditor value={value} onChange={onChange} />, { wrapper: FormWrapper });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('only shows the links editor when exemplars are enabled', () => {
    renderEditor({ directUrl: 'http://localhost:9090' });
    expect(screen.queryByRole('button', { name: 'Add link' })).not.toBeInTheDocument();
  });

  it('removes the exemplars section when disabling exemplars without links', () => {
    renderEditor({ directUrl: 'http://localhost:9090', exemplars: { enable: true } });
    userEvent.click(screen.getByRole('checkbox', { name: 'Enable exemplars' }));
    expect(onChange).toHaveBeenCalledWith({ directUrl: 'http://localhost:9090', exemplars: undefined });
  });

  it('keeps the links when disabling exemplars', () => {
    renderEditor({ directUrl: 'http://localhost:9090', exemplars: { enable: true, links: [link] } });
    userEvent.click(screen.getByRole('checkbox', { name: 'Enable exemplars' }));
    expect(onChange).toHaveBeenCalledWith({
      directUrl: 'http://localhost:9090',
      exemplars: { enable: false, links: [link] },
    });
  });

  it('adds and removes links in the exemplars section', () => {
    renderEditor({ directUrl: 'http://localhost:9090', exemplars: { enable: true, links: [link] } });

    userEvent.click(screen.getByRole('button', { name: 'Add link' }));
    expect(onChange).toHaveBeenLastCalledWith({
      directUrl: 'http://localhost:9090',
      exemplars: { enable: true, links: [link, { url: '', traceIDLabel: 'trace_id' }] },
    });

    userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }));
    expect(onChange).toHaveBeenLastCalledWith({
      directUrl: 'http://localhost:9090',
      exemplars: { enable: true },
    });
  });
});
