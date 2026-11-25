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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { TrinoDatasourceEditor } from './TrinoDatasourceEditor';

function FormWrapper({ children }: { children: ReactNode }): ReactElement {
  const form = useForm();
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe('TrinoDatasourceEditor', () => {
  it('shows the Test Connection button only when testConnection is given and runs it on click', async () => {
    const value = { directUrl: 'http://trino.example.com' };
    const { rerender } = render(<TrinoDatasourceEditor value={value} onChange={vi.fn()} />, {
      wrapper: FormWrapper,
    });
    expect(screen.queryByRole('button', { name: 'Test Connection' })).not.toBeInTheDocument();

    const testConnection = vi.fn().mockResolvedValue(undefined);
    rerender(<TrinoDatasourceEditor value={value} onChange={vi.fn()} testConnection={testConnection} />);
    userEvent.click(screen.getByRole('button', { name: 'Test Connection' }));
    await waitFor(() => expect(testConnection).toHaveBeenCalledTimes(1));
  });

  it('allows GET /v1/info in the default proxy endpoints', () => {
    const onChange = vi.fn();
    render(<TrinoDatasourceEditor value={{ directUrl: '' }} onChange={onChange} />, { wrapper: FormWrapper });

    userEvent.click(screen.getByRole('radio', { name: /proxy/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        proxy: expect.objectContaining({
          spec: expect.objectContaining({
            allowedEndpoints: expect.arrayContaining([{ endpointPattern: '/v1/info', method: 'GET' }]),
          }),
        }),
      }),
    );
  });
});
