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

import type * as PluginSystemModule from '@perses-dev/plugin-system';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Mock } from 'vitest';

import { QUERY_LANGUAGES } from '../constants';
import type { OpenSearchLogQuerySpec } from './opensearch-log-query-types';
import { OpenSearchLogQueryEditor, parseLimitInput } from './OpenSearchLogQueryEditor';

vi.mock('@perses-dev/plugin-system', async (importOriginal) => ({
  ...(await importOriginal<typeof PluginSystemModule>()),
  DatasourceSelect: (): JSX.Element => <div data-testid="datasource-select" />,
  useDatasourceSelectValueToSelector: (): undefined => undefined,
  isVariableDatasource: (): boolean => false,
}));

// Make the Mod+Enter handler call its callback on any keydown, decoupling the test
// from the host lib's platform-specific key detection.
vi.mock('@perses-dev/dashboards', () => ({
  createModEnterHandler: (cb: () => void) => (): void => cb(),
}));

function setup(initial: OpenSearchLogQuerySpec = { query: '' }): { onChange: Mock } {
  const onChange = vi.fn();
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
    expect(link).toHaveAttribute('href', QUERY_LANGUAGES.ppl.docsUrl);
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

describe('OpenSearchLogQueryEditor language selector', () => {
  it('shows PPL as the selected language when the spec has none', () => {
    setup({ query: 'source=logs-*' });
    expect(screen.getByLabelText('Query language')).toHaveTextContent('PPL');
  });

  it('writes queryLanguage to the spec without clearing the query', () => {
    const { onChange } = setup({ query: 'source=logs-*' });

    fireEvent.mouseDown(screen.getByLabelText('Query language'));
    fireEvent.click(screen.getByRole('option', { name: 'Lucene' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryLanguage: 'lucene', query: 'source=logs-*' }));
  });

  it('marks the index field required for Lucene when it is empty', () => {
    setup({ query: 'level:error', queryLanguage: 'lucene' });
    expect(screen.getByText('Required for Lucene and Query DSL')).toBeInTheDocument();
  });

  it('does not mark the index field required for PPL', () => {
    setup({ query: 'source=logs-*', queryLanguage: 'ppl' });
    expect(screen.queryByText('Required for Lucene and Query DSL')).not.toBeInTheDocument();
  });

  it('shows the limit field only for the _search languages', () => {
    setup({ query: 'source=logs-*', queryLanguage: 'ppl' });
    expect(screen.queryByLabelText(/Limit/)).not.toBeInTheDocument();
  });

  it('shows the limit field for lucene and dsl', () => {
    setup({ query: 'level:error', queryLanguage: 'lucene', index: 'logs-*' });
    expect(screen.getByLabelText(/Limit/)).toBeInTheDocument();
  });

  it('switches the query field label and placeholder with the language', () => {
    setup({ query: '', queryLanguage: 'sql' });
    expect(screen.getByText('SQL Query')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/SELECT/)).toBeInTheDocument();
  });

  it('renders without throwing and falls back to PPL for an out-of-enum queryLanguage', () => {
    // Cast through `as` since 'kql' is not a valid OpenSearchQueryLanguage — this simulates a
    // hand-edited or hand-crafted spec reaching the editor at runtime, bypassing the type system.
    expect(() =>
      setup({ query: 'source=logs-*', queryLanguage: 'kql' as OpenSearchLogQuerySpec['queryLanguage'] }),
    ).not.toThrow();
    expect(screen.getByLabelText('Query language')).toHaveTextContent('PPL');
  });

  it('carries forward an uncommitted (unblurred) query edit when the language is switched', () => {
    const { onChange } = setup({ query: 'source=logs-*' });

    // Edit the query field without blurring it — useQueryState only commits to the spec on blur,
    // so at this point value.query is still the old text and only local state has the new text.
    fireEvent.change(screen.getByPlaceholderText(/source=logs-/), {
      target: { value: 'source=logs-* | where level="warn"' },
    });

    fireEvent.mouseDown(screen.getByLabelText('Query language'));
    fireEvent.click(screen.getByRole('option', { name: 'Lucene' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ queryLanguage: 'lucene', query: 'source=logs-* | where level="warn"' }),
    );
  });
});

describe('OpenSearchLogQueryEditor limit field', () => {
  // A native <input type="number"> sanitizes an invalid string ("abc", " 5" — leading whitespace
  // is not a valid floating-point-number character) to "" before React ever sees a change event,
  // so those two inputs cannot be produced by firing a DOM change on the rendered field itself.
  // We cover them with a direct unit test of parseLimitInput below instead, and cover the
  // DOM-reachable values (empty, zero, negative, decimal) end-to-end through the rendered input.
  it.each([
    ['', undefined],
    ['0', undefined],
    ['-5', undefined],
    ['3.7', 3],
  ])('sets limit to %p -> %p via the rendered field', (input, expected) => {
    // Start from a non-empty value so every target value below is a genuine DOM change —
    // starting from "" would make the "" case a same-value no-op that never fires onChange.
    const { onChange } = setup({ query: 'level:error', queryLanguage: 'lucene', index: 'logs-*', limit: 999 });

    fireEvent.change(screen.getByLabelText(/Limit/), { target: { value: input } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ limit: expected }));
  });

  it.each([
    ['', undefined],
    ['0', undefined],
    ['-5', undefined],
    ['abc', undefined],
    ['3.7', 3],
    [' 5', 5],
  ])('parseLimitInput(%p) -> %p', (input, expected) => {
    expect(parseLimitInput(input)).toBe(expected);
  });
});
