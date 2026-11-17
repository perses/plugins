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

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExemplarLinksEditor } from './ExemplarLinksEditor';
import type { PrometheusExemplarLinkSpec } from './types';

const jaeger: PrometheusExemplarLinkSpec = {
  name: 'Jaeger',
  url: 'http://localhost:16686/trace/${traceId}',
  traceIDLabel: 'trace_id',
};
const tempo: PrometheusExemplarLinkSpec = {
  url: 'https://tempo.example.com/trace/${traceId}',
  traceIDLabel: 'traceID',
};

describe('ExemplarLinksEditor', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the configured links', () => {
    render(<ExemplarLinksEditor value={[jaeger, tempo]} onChange={onChange} />);

    const first = within(screen.getByRole('group', { name: 'Link 1' }));
    expect(first.getByRole('textbox', { name: 'Name' })).toHaveValue('Jaeger');
    expect(first.getByRole('textbox', { name: 'URL' })).toHaveValue('http://localhost:16686/trace/${traceId}');
    expect(first.getByRole('textbox', { name: 'Trace ID label' })).toHaveValue('trace_id');

    const second = within(screen.getByRole('group', { name: 'Link 2' }));
    expect(second.getByRole('textbox', { name: 'Name' })).toHaveValue('');
    expect(second.getByRole('textbox', { name: 'Trace ID label' })).toHaveValue('traceID');
  });

  it('adds a link with the default trace ID label', () => {
    render(<ExemplarLinksEditor value={undefined} onChange={onChange} />);
    userEvent.click(screen.getByRole('button', { name: 'Add link' }));
    expect(onChange).toHaveBeenCalledWith([{ url: '', traceIDLabel: 'trace_id' }]);
  });

  it('updates a field of a link without touching the others', () => {
    render(<ExemplarLinksEditor value={[jaeger, tempo]} onChange={onChange} />);
    const second = within(screen.getByRole('group', { name: 'Link 2' }));
    fireEvent.change(second.getByRole('textbox', { name: 'Name' }), { target: { value: 'Tempo' } });
    expect(onChange).toHaveBeenCalledWith([jaeger, { ...tempo, name: 'Tempo' }]);
  });

  it('leaves an empty name out of the spec', () => {
    render(<ExemplarLinksEditor value={[jaeger]} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith([{ url: jaeger.url, traceIDLabel: jaeger.traceIDLabel }]);
  });

  it('removes a link, and the whole list with the last one', () => {
    const { rerender } = render(<ExemplarLinksEditor value={[jaeger, tempo]} onChange={onChange} />);
    userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }));
    expect(onChange).toHaveBeenLastCalledWith([tempo]);

    rerender(<ExemplarLinksEditor value={[tempo]} onChange={onChange} />);
    userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('flags the required fields left empty', () => {
    render(<ExemplarLinksEditor value={[{ url: '', traceIDLabel: '' }]} onChange={onChange} />);
    expect(screen.getByRole('textbox', { name: 'URL' })).toBeInvalid();
    expect(screen.getByRole('textbox', { name: 'Trace ID label' })).toBeInvalid();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeValid();
  });

  it('cannot be edited when read-only', () => {
    render(<ExemplarLinksEditor value={[jaeger]} onChange={onChange} isReadonly />);
    expect(screen.getByRole('textbox', { name: 'URL' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add link' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove link 1' })).not.toBeInTheDocument();
  });
});
