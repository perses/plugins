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
import { describe, expect, it } from 'vitest';

import { EditorCanvasShortcutsTooltip, ViewCanvasShortcutsTooltip } from './CanvasShortcutsTooltip';

// jsdom has no navigator.platform → MOD_KEY falls back to 'Ctrl'
const MOD = 'Ctrl';

describe('ViewCanvasShortcutsTooltip', () => {
  it('renders a button with the accessible label', () => {
    render(<ViewCanvasShortcutsTooltip />);
    expect(screen.getByRole('button', { name: 'Canvas interaction shortcuts' })).toBeDefined();
  });

  it('shows view shortcut rows on hover', async () => {
    render(<ViewCanvasShortcutsTooltip />);
    await userEvent.hover(screen.getByRole('button', { name: 'Canvas interaction shortcuts' }));
    await waitFor(() => {
      expect(screen.getByText('Zoom in / out')).toBeDefined();
      expect(screen.getByText('Pan')).toBeDefined();
      expect(screen.getByText('Reset pan & zoom')).toBeDefined();
      expect(screen.getByText('Fit all nodes in view')).toBeDefined();
    });
  });

  it('does not show the editor-only Delete shortcut', async () => {
    render(<ViewCanvasShortcutsTooltip />);
    await userEvent.hover(screen.getByRole('button', { name: 'Canvas interaction shortcuts' }));
    await waitFor(() => screen.getByText('Zoom in / out'));
    expect(screen.queryByText('Delete selected')).toBeNull();
  });

  it('shows Ctrl as modifier key in jsdom (no navigator.platform)', async () => {
    render(<ViewCanvasShortcutsTooltip />);
    await userEvent.hover(screen.getByRole('button', { name: 'Canvas interaction shortcuts' }));
    await waitFor(() => screen.getByText('Zoom in / out'));
    expect(screen.getAllByText(MOD).length).toBeGreaterThan(0);
  });
});

describe('EditorCanvasShortcutsTooltip', () => {
  it('renders a button with the accessible label', () => {
    render(<EditorCanvasShortcutsTooltip />);
    expect(screen.getByRole('button', { name: 'Canvas interaction shortcuts' })).toBeDefined();
  });

  it('shows all view rows plus Delete selected on hover', async () => {
    render(<EditorCanvasShortcutsTooltip />);
    await userEvent.hover(screen.getByRole('button', { name: 'Canvas interaction shortcuts' }));
    await waitFor(() => {
      expect(screen.getByText('Zoom in / out')).toBeDefined();
      expect(screen.getByText('Delete selected')).toBeDefined();
    });
  });

  it('shows Delete and Backspace key chips for the delete shortcut', async () => {
    render(<EditorCanvasShortcutsTooltip />);
    await userEvent.hover(screen.getByRole('button', { name: 'Canvas interaction shortcuts' }));
    await waitFor(() => screen.getByText('Delete selected'));
    expect(screen.getByText('Delete')).toBeDefined();
    expect(screen.getByText('Backspace')).toBeDefined();
  });
});
