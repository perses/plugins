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

import { render, screen, fireEvent } from '@testing-library/react';
import { PPL_DOCS_URL } from '../constants';
import { OpenSearchLogQueryEditor } from './OpenSearchLogQueryEditor';
import { OpenSearchLogQuerySpec } from './opensearch-log-query-types';

jest.mock('@perses-dev/plugin-system', () => ({
  ...jest.requireActual('@perses-dev/plugin-system'),
  DatasourceSelect: (): JSX.Element => <div data-testid="datasource-select" />,
  useDatasourceSelectValueToSelector: (): undefined => undefined,
  isVariableDatasource: (): boolean => false,
}));

// Make the Mod+Enter handler call its callback on any keydown, decoupling the test
// from the host lib's platform-specific key detection.
jest.mock('@perses-dev/dashboards', () => ({
  createModEnterHandler: (cb: () => void) => (): void => cb(),
}));

function setup(initial: OpenSearchLogQuerySpec = { query: '' }): { onChange: jest.Mock } {
  const onChange = jest.fn();
  render(<OpenSearchLogQueryEditor value={initial} onChange={onChange} />);
  return { onChange };
}

describe('OpenSearchLogQueryEditor', () => {
  it('renders datasource picker, index, timestamp/message field, and query inputs', () => {
    setup();
    expect(screen.getByTestId('datasource-select')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. logs-*')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('@timestamp')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('message')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/source=logs-/)).toBeInTheDocument();
  });

  it('persists timestampField into spec when typed', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByPlaceholderText('@timestamp'), { target: { value: 'time' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ timestampField: 'time' }));
  });

  it('clears messageField when emptied', () => {
    const { onChange } = setup({ query: '', messageField: 'body' });
    fireEvent.change(screen.getByPlaceholderText('message'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ messageField: undefined }));
  });

  it('toggles disableTimeFilter on when the checkbox is clicked', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByLabelText('Disable automatic time filtering'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ disableTimeFilter: true }));
  });

  it('clears disableTimeFilter when unchecked', () => {
    const { onChange } = setup({ query: '', disableTimeFilter: true });
    fireEvent.click(screen.getByLabelText('Disable automatic time filtering'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ disableTimeFilter: undefined }));
  });

  it('notes that source= in the PPL query overrides the Index field', () => {
    setup();
    expect(screen.getByText(/Ignored when the PPL query starts with/i)).toBeInTheDocument();
  });

  it('links to the OpenSearch PPL documentation', () => {
    setup();
    const link = screen.getByRole('link', { name: /PPL/i });
    expect(link).toHaveAttribute('href', PPL_DOCS_URL);
  });

  it('renders a Query Examples disclosure', () => {
    setup();
    expect(screen.getByText('Query Examples')).toBeInTheDocument();
  });

  it('commits the query on Mod+Enter', () => {
    const { onChange } = setup({ query: 'source=logs-*' });
    fireEvent.keyDown(screen.getByPlaceholderText(/source=logs-/), { key: 'Enter', ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ query: 'source=logs-*' }));
  });
});
