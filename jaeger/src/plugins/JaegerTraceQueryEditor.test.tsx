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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDatasourceClient, useDatasourceSelectValueToSelector } from '@perses-dev/plugin-system';
import { JaegerTraceQueryEditor } from './JaegerTraceQueryEditor';

jest.mock('@perses-dev/components', () => ({
  useId: jest.fn(() => 'jaeger-datasource-label'),
}));

jest.mock('@perses-dev/plugin-system', () => ({
  DatasourceSelect: jest.fn(() => null),
  useDatasourceClient: jest.fn(),
  useDatasourceSelectValueToSelector: jest.fn((value) => value),
}));

const mockedUseDatasourceClient = useDatasourceClient as jest.MockedFunction<typeof useDatasourceClient>;
const mockedUseDatasourceSelectValueToSelector = useDatasourceSelectValueToSelector as jest.MockedFunction<
  typeof useDatasourceSelectValueToSelector
>;

describe('JaegerTraceQueryEditor', () => {
  beforeEach(() => {
    mockedUseDatasourceSelectValueToSelector.mockImplementation(
      () =>
        ({
          kind: 'JaegerDatasource',
        }) as never
    );
  });

  it('commits typed values on blur instead of each keystroke', async () => {
    mockedUseDatasourceClient.mockReturnValue({
      data: {
        searchServices: jest.fn(async () => ({ data: [] })),
        searchOperations: jest.fn(async () => ({ data: [] })),
      },
    } as never);

    const onChange = jest.fn();
    render(<JaegerTraceQueryEditor value={{ service: 'frontend' }} onChange={onChange} />);

    const traceIdInput = screen.getByLabelText('Trace ID');
    fireEvent.change(traceIdInput, { target: { value: '7d73f3ae841bf59a' } });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(traceIdInput);

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        service: 'frontend',
        traceId: '7d73f3ae841bf59a',
      })
    );
  });

  it('normalizes empty and whitespace-only optional fields from the incoming spec', async () => {
    mockedUseDatasourceClient.mockReturnValue({
      data: {
        searchServices: jest.fn(async () => ({ data: [] })),
        searchOperations: jest.fn(async () => ({ data: [] })),
      },
    } as never);

    const onChange = jest.fn();
    render(
      <JaegerTraceQueryEditor
        value={{
          service: '',
          operation: '   ',
          minDuration: ' 50ms ',
        }}
        onChange={onChange}
      />
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        minDuration: '50ms',
        operation: undefined,
        service: undefined,
      })
    );
  });

  it('loads service and operation options from the datasource client', async () => {
    const searchServices = jest.fn(async () => ({ data: ['checkout', 'frontend'] }));
    const searchOperations = jest.fn(async () => ({
      data: [
        { name: 'GET /api/cart', spanKind: 'server' },
        { name: 'GET /api/cart', spanKind: 'client' },
        { name: 'POST /api/cart', spanKind: 'server' },
      ],
    }));

    mockedUseDatasourceClient.mockReturnValue({
      data: {
        searchServices,
        searchOperations,
      },
    } as never);

    render(<JaegerTraceQueryEditor value={{ service: 'frontend' }} onChange={jest.fn()} />);

    await waitFor(() => expect(searchServices).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(searchOperations).toHaveBeenCalledWith('frontend'));
  });
});
