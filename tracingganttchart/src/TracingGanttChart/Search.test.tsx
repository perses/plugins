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

import { ChartsProvider, testChartsTheme } from '@perses-dev/components';
import * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';
import { fireEvent, screen } from '@testing-library/dom';
import { render, renderHook, act, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';

import * as exampleTrace from '../test/traces/example_otlp.json';
import { SearchBar, useSpanSearch } from './Search';
import { getTraceModel } from './trace';

const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);

describe('useSpanSearch', () => {
  it('returns no matches for empty query', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    expect(result.current.matchingSpanIds).toEqual([]);
    expect(result.current.focusedMatchIndex).toBe(0);
  });

  it('matches spans by name', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('testChildSpan2'));
    expect(result.current.matchingSpanIds).toEqual(['sid2']);
  });

  it('matches spans by service name', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('shop-backend'));
    expect(result.current.matchingSpanIds).toEqual(['sid1', 'sid2', 'sid3']);
  });

  it('matches spans by span ID', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('sid3'));
    expect(result.current.matchingSpanIds).toEqual(['sid3']);
  });

  it('matches spans by attribute key', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('http.method'));
    expect(result.current.matchingSpanIds).toEqual(['sid2', 'sid3']);
  });

  it('matches spans by attribute value', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('DELETE'));
    expect(result.current.matchingSpanIds).toEqual(['sid2']);
  });

  it('matches spans by resource attribute value', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('service.name'));
    expect(result.current.matchingSpanIds).toEqual(['sid1', 'sid2', 'sid3']);
  });

  it('matches case-insensitively', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('TESTCHILDSPAN3'));
    expect(result.current.matchingSpanIds).toEqual(['sid3']);
  });

  it('resets focused match index when query changes', () => {
    const { result } = renderHook(() => useSpanSearch(trace));
    act(() => result.current.setSearchQuery('shop-backend'));
    act(() => result.current.setFocusedMatchIndex(2));
    expect(result.current.focusedMatchIndex).toBe(2);

    act(() => result.current.setSearchQuery('testChildSpan2'));
    expect(result.current.focusedMatchIndex).toBe(0);
  });
});

describe('SearchBar', () => {
  function SearchBarWithHook(): ReactElement {
    const search = useSpanSearch(trace);
    return <SearchBar search={search} />;
  }

  const renderComponent = (): RenderResult => {
    return render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <SearchBarWithHook />
      </ChartsProvider>
    );
  };

  it('navigates to next match with Enter', () => {
    renderComponent();
    const input = screen.getByPlaceholderText('Search spans...');
    fireEvent.change(input, { target: { value: 'shop-backend' } });
    expect(screen.getByText('1/3')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('2/3')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('3/3')).toBeInTheDocument();

    // wraps around
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('navigates to previous match with Shift+Enter', () => {
    renderComponent();
    const input = screen.getByPlaceholderText('Search spans...');
    fireEvent.change(input, { target: { value: 'shop-backend' } });

    // wraps around from first to last
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(screen.getByText('3/3')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    renderComponent();
    const input = screen.getByPlaceholderText('Search spans...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'shop-backend' } });
    expect(input.value).toBe('shop-backend');

    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(input.value).toBe('');
  });

  it('displays 0/0 for no matches', () => {
    renderComponent();
    const input = screen.getByPlaceholderText('Search spans...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });
});
