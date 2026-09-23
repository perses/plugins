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

import { SnackbarProvider } from '@perses-dev/components';
import type * as PluginSystemModule from '@perses-dev/plugin-system';
import type { PanelData } from '@perses-dev/plugin-system';
import type { Alert, AlertsData } from '@perses-dev/spec';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';

import { AlertTablePanel } from './AlertTablePanel';

vi.mock('@perses-dev/plugin-system', async (importOriginal) => {
  const actual = await importOriginal<typeof PluginSystemModule>();
  const noVariables = {};
  return {
    ...actual,
    useDatasourceClient: vi.fn().mockReturnValue({ data: undefined }),
    useAllVariableValues: vi.fn().mockReturnValue(noVariables),
  };
});

const SPEC = { defaultGroupBy: [] };
const CONTENT_DIMENSIONS = { width: 800, height: 600 };

const makeAlert = (id: string, runbookUrl: string): Alert => ({
  id,
  name: `Alert-${id}`,
  state: 'firing',
  labels: { alertname: `Alert-${id}` },
  annotations: { runbook_url: runbookUrl },
  severity: 'critical',
  startsAt: '2024-01-01T00:00:00Z',
  endsAt: '2024-01-01T01:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  receivers: [],
});

const renderPanel = (runbookUrl: string): void => {
  const queryResults = [{ data: { alerts: [makeAlert('a', runbookUrl)] } }] as unknown as Array<PanelData<AlertsData>>;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SnackbarProvider>
        <AlertTablePanel spec={SPEC} queryResults={queryResults} contentDimensions={CONTENT_DIMENSIONS} />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Expand all groups' }));
};

describe('AlertTablePanel runbook link', () => {
  it.each(['https://runbooks.example.com/alert', 'http://runbooks.example.com/alert'])('links to %s', (url) => {
    renderPanel(url);
    expect(screen.getByRole('link', { name: 'View runbook' })).toHaveAttribute('href', url);
  });

  it.each([
    '//evil.example.com/malicious',
    'file:///etc/passwd',
    '  javascript:alert(1)',
    '/runbooks/alert',
    'mailto:security@example.com',
    'vbscript:msgbox(1)',
    "data:text/html,<script>alert('XSS')</script>",
    "javascript:alert('XSS Attack!')",
  ])('does not link to %s', (url) => {
    renderPanel(url);
    expect(screen.queryByRole('link', { name: 'View runbook' })).not.toBeInTheDocument();
  });
});
