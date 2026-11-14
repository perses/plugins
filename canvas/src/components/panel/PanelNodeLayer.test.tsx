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

import type { VariableStateMap } from '@perses-dev/components';
import type * as PluginSystemModule from '@perses-dev/plugin-system';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import type { CanvasTheme } from '../../hooks/useCanvasTheme';
import type { CanvasSpec } from '../../model';
import { PanelNodeLayer } from './PanelNodeLayer';

vi.mock('@perses-dev/plugin-system', async (importOriginal) => ({
  ...(await importOriginal<typeof PluginSystemModule>()),
  useAllVariableValues: (): VariableStateMap => ({
    host: { value: 'example.com', loading: false },
    target: { value: 'javascript:alert(document.domain)', loading: false },
  }),
}));

vi.mock('../../hooks/useCanvasTheme', () => ({
  useCanvasTheme: (): Pick<CanvasTheme, 'connection' | 'nodeDefaultFill'> => ({
    connection: '#000000',
    nodeDefaultFill: '#ffffff',
  }),
}));

function renderNode(url: string): void {
  const spec: CanvasSpec = {
    nodes: [{ id: 'node', position: { x: 0, y: 0 }, width: 40, height: 40, kind: 'text', label: 'node', url }],
  };
  render(
    <svg>
      <PanelNodeLayer spec={spec} seriesByQueryIndex={new Map()} k={1} paletteColors={[]} />
    </svg>,
  );
}

describe('PanelNodeLayer', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null);

  beforeEach(() => {
    open.mockClear();
  });

  it('opens the interpolated URL of a node in a new tab', () => {
    renderNode('https://$host/status');
    fireEvent.click(screen.getByText('node'));
    expect(open).toHaveBeenCalledWith('https://example.com/status', '_blank', 'noopener,noreferrer');
  });

  it('opens a relative URL', () => {
    renderNode('/projects/demo/dashboards/demo');
    fireEvent.click(screen.getByText('node'));
    expect(open).toHaveBeenCalledWith('/projects/demo/dashboards/demo', '_blank', 'noopener,noreferrer');
  });

  it.each(['javascript:alert(document.domain)', ' JaVa\tScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>'])(
    'does not open the URL %j',
    (url) => {
      renderNode(url);
      fireEvent.click(screen.getByText('node'));
      expect(open).not.toHaveBeenCalled();
    },
  );

  it('does not open a URL whose scheme is provided by a variable', () => {
    renderNode('$target');
    fireEvent.click(screen.getByText('node'));
    expect(open).not.toHaveBeenCalled();
  });
});
