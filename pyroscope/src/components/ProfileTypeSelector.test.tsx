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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ProfileType, SearchLabelValuesResponse, SearchProfileTypesResponse } from '../model';
import { DEFAULT_PYROSCOPE } from '../model';
import { ProfileTypeSelector } from './ProfileTypeSelector';

// Go and Java (async-profiler) block profiles share a name and sample type but not their period type.
const GO_BLOCK_CONTENTIONS = 'block:contentions:count:contentions:count';
const JAVA_BLOCK_CONTENTIONS = 'block:contentions:count:block:count';
const GO_GOROUTINE = 'goroutine:goroutine:count:goroutine:count';
const GO_ALLOC_SPACE = 'memory:alloc_space:bytes:space:bytes';
const JAVA_ALLOC_IN_NEW_TLAB = 'memory:alloc_in_new_tlab_bytes:bytes:space:bytes';

// Label values of a Go service, in a tenant that also holds Java services.
const GO_SERVICE_LABEL_VALUES: Record<string, string[]> = {
  __name__: ['block', 'goroutine', 'memory'],
  __profile_type__: [GO_BLOCK_CONTENTIONS, GO_GOROUTINE, GO_ALLOC_SPACE],
};

const mocks = vi.hoisted(() => ({
  client: {
    searchProfileTypes: vi.fn(),
    searchLabelValues: vi.fn(),
  },
}));

vi.mock('@perses-dev/plugin-system', async (importOriginal) => {
  const actual = await importOriginal<typeof PluginSystemModule>();
  return {
    ...actual,
    useDatasourceClient: (): unknown => ({ data: mocks.client }),
    useTimeRange: (): unknown => ({
      absoluteTimeRange: { start: new Date('2026-11-25T15:00:00Z'), end: new Date('2026-11-25T16:00:00Z') },
    }),
  };
});

function makeProfileType(ID: string): ProfileType {
  const [name = '', sampleType = '', sampleUnit = '', periodType = '', periodUnit = ''] = ID.split(':');
  return { ID, name, sampleType, sampleUnit, periodType, periodUnit };
}

describe('ProfileTypeSelector', () => {
  it('only lists the profile types of the selected service', async () => {
    const profileTypes = [
      JAVA_BLOCK_CONTENTIONS,
      GO_BLOCK_CONTENTIONS,
      GO_GOROUTINE,
      JAVA_ALLOC_IN_NEW_TLAB,
      GO_ALLOC_SPACE,
    ].map(makeProfileType);
    mocks.client.searchProfileTypes.mockResolvedValue({ profileTypes } satisfies SearchProfileTypesResponse);
    mocks.client.searchLabelValues.mockImplementation(
      async (_params: unknown, _headers: unknown, body: { name: string }): Promise<SearchLabelValuesResponse> => ({
        names: GO_SERVICE_LABEL_VALUES[body.name] ?? [],
      }),
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProfileTypeSelector datasource={DEFAULT_PYROSCOPE} value="" service="argos/alloy" />
      </QueryClientProvider>,
    );
    userEvent.click(screen.getByRole('combobox', { name: 'Profile Type' }));
    await screen.findByRole('option', { name: 'goroutine/goroutine' });

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'block/contentions',
      'goroutine/goroutine',
      'memory/alloc_space',
    ]);
  });
});
