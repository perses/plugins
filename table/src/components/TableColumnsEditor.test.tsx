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
import type * as PluginSystemModule from '@perses-dev/plugin-system';
import { fireEvent, render, screen } from '@testing-library/react';

import type { TableOptions } from '../models';
import { TableColumnsEditor } from './TableColumnsEditor';

vi.mock('@perses-dev/plugin-system', async (importOriginal) => ({
  ...(await importOriginal<typeof PluginSystemModule>()),
  PluginKindSelect: (): null => null,
}));

function selectOption(comboboxName: string, option: RegExp): void {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: comboboxName }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

function renderTableColumnsEditor(value: TableOptions, onChange = vi.fn()): void {
  render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <TableColumnsEditor value={value} onChange={onChange} />
    </ChartsProvider>,
  );
}

function expand(): void {
  fireEvent.click(screen.getByTestId('column-toggle#column_0'));
}

describe('TableColumnsEditor', () => {
  it('can add a new column settings', () => {
    const onChange = vi.fn();
    renderTableColumnsEditor({ columnSettings: [] }, onChange);
    const addColumnButton = screen.getByRole('button', { name: /Add Column Settings/i });
    fireEvent.click(addColumnButton);
    expect(onChange).toHaveBeenCalledWith({ columnSettings: [{ name: 'column_0' }] });
  });

  it('can enable column custom width', () => {
    const onChange = vi.fn();
    renderTableColumnsEditor({ columnSettings: [{ name: 'column_0' }] }, onChange);

    // Expand the column settings editor for column_0
    const collapseIcon = screen.getByTestId('column-toggle#column_0');
    fireEvent.click(collapseIcon);
    const customWidthSwitch = screen.getByRole('checkbox', { name: /Custom width/i });
    fireEvent.click(customWidthSwitch);
    expect(onChange).toHaveBeenCalledWith({ columnSettings: [{ name: 'column_0', width: 100 }] });
  });

  it('can rename a column', () => {
    const onChange = vi.fn();
    renderTableColumnsEditor({ columnSettings: [{ name: 'column_0' }] }, onChange);

    // Expand the column settings editor for column_0
    const collapseIcon = screen.getByTestId('column-toggle#column_0');
    fireEvent.click(collapseIcon);

    const nameInput = screen.getByRole('textbox', { name: /Name/i });
    fireEvent.change(nameInput, { target: { value: 'MySuperName' } });
    expect(onChange).toHaveBeenCalledWith({ columnSettings: [{ name: 'MySuperName' }] });
  });
  describe('cell display', () => {
    it('shows the selected display mode', () => {
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: {} }] });
      expand();
      expect(screen.getByRole('combobox', { name: 'Cell display' })).toHaveValue('Tags');
    });

    it('describes each display mode', () => {
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0' }] });
      expand();
      fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Cell display' }));
      expect(screen.getByRole('option', { name: /^Text/ })).toHaveTextContent('Show the formatted value as plain text');
      expect(screen.getByRole('option', { name: /^Tags/ })).toHaveTextContent(
        'Split the value by a delimiter and show each part as a colored tag',
      );
      expect(screen.getByRole('option', { name: /^Visualization/ })).toHaveTextContent(
        'Render a panel, such as a gauge, inside the cell',
      );
    });

    it('keeps the visualization kind when re-selecting visualization', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor(
        { columnSettings: [{ name: 'column_0', plugin: { kind: 'StatChart', spec: {} } }] },
        onChange,
      );
      expand();
      selectOption('Cell display', /^Visualization/);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('tags', () => {
    it('switches a column to tags mode', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0' }] }, onChange);
      expand();
      selectOption('Cell display', /^Tags/);
      expect(onChange).toHaveBeenCalledWith({ columnSettings: [{ name: 'column_0', tags: {} }] });
    });

    it('clears tags when switching back to text', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: { delimiter: ',' } }] }, onChange);
      expand();
      selectOption('Cell display', /^Text/);
      expect(onChange).toHaveBeenCalledWith({ columnSettings: [{ name: 'column_0' }] });
    });

    it('clears tags when switching to visualization', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: {} }] }, onChange);
      expand();
      selectOption('Cell display', /^Visualization/);
      expect(onChange).toHaveBeenCalledWith({
        columnSettings: [{ name: 'column_0', plugin: { kind: 'GaugeChart', spec: {} } }],
      });
    });

    it('edits and clears the delimiter', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: { delimiter: ',' } }] }, onChange);
      expand();
      const input = screen.getByRole('textbox', { name: /Delimiter/i });
      fireEvent.change(input, { target: { value: ';' } });
      expect(onChange).toHaveBeenLastCalledWith({ columnSettings: [{ name: 'column_0', tags: { delimiter: ';' } }] });
      fireEvent.change(input, { target: { value: '' } });
      expect(onChange).toHaveBeenLastCalledWith({ columnSettings: [{ name: 'column_0', tags: {} }] });
    });

    it('sets the color mode of unmatched tags', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: { delimiter: ',' } }] }, onChange);
      expand();
      selectOption('Color mode', /^Palette/);
      expect(onChange).toHaveBeenLastCalledWith({
        columnSettings: [{ name: 'column_0', tags: { delimiter: ',', colorMode: 'palette' } }],
      });
      selectOption('Color mode', /^Manual/);
      expect(onChange).toHaveBeenLastCalledWith({
        columnSettings: [{ name: 'column_0', tags: { delimiter: ',', colorMode: 'manual' } }],
      });
    });

    it('shows the color mode control', () => {
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: {} }] });
      expand();
      expect(screen.getByRole('combobox', { name: 'Color mode' })).toHaveValue('Auto');
      expect(screen.getByText('Conditional Cell Format rules take priority over the color mode.')).toBeInTheDocument();
    });

    it('describes each color mode', () => {
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: {} }] });
      expand();
      fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Color mode' }));
      expect(screen.getByRole('option', { name: /^Auto/ })).toHaveTextContent(
        'Color generated from the tag value, the same value keeps its color',
      );
      expect(screen.getByRole('option', { name: /^Palette/ })).toHaveTextContent(
        'Color from the theme chart palette, picked from the tag value',
      );
      expect(screen.getByRole('option', { name: /^Manual/ })).toHaveTextContent('Every tag uses the default tag color');
    });

    it('keeps the default color when re-selecting manual', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor(
        { columnSettings: [{ name: 'column_0', tags: { colorMode: 'manual', defaultColor: '#123456' } }] },
        onChange,
      );
      expand();
      selectOption('Color mode', /^Manual/);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('removes the color mode and default color when switching to automatic', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor(
        { columnSettings: [{ name: 'column_0', tags: { colorMode: 'manual', defaultColor: '#123456' } }] },
        onChange,
      );
      expand();
      selectOption('Color mode', /^Auto/);
      expect(onChange).toHaveBeenLastCalledWith({ columnSettings: [{ name: 'column_0', tags: {} }] });
    });

    it('removes the default color when switching from manual to palette', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor(
        { columnSettings: [{ name: 'column_0', tags: { colorMode: 'manual', defaultColor: '#123456' } }] },
        onChange,
      );
      expand();
      selectOption('Color mode', /^Palette/);
      expect(onChange).toHaveBeenLastCalledWith({
        columnSettings: [{ name: 'column_0', tags: { colorMode: 'palette' } }],
      });
    });

    it('shows the default tag color only in manual mode', () => {
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: { colorMode: 'palette' } }] });
      expand();
      expect(screen.queryByRole('button', { name: 'change Default tag color color' })).not.toBeInTheDocument();
    });

    it('sets the default tag color in manual mode', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', tags: { colorMode: 'manual' } }] }, onChange);
      expand();
      fireEvent.click(screen.getByRole('button', { name: 'change Default tag color color' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'enter hex color' }), { target: { value: '#123456' } });
      expect(onChange).toHaveBeenLastCalledWith({
        columnSettings: [{ name: 'column_0', tags: { colorMode: 'manual', defaultColor: '#123456' } }],
      });
    });

    it('adds the missing # to a pasted default tag color', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor(
        { columnSettings: [{ name: 'column_0', tags: { colorMode: 'manual', defaultColor: '#9e9e9e' } }] },
        onChange,
      );
      expand();
      fireEvent.click(screen.getByRole('button', { name: 'change Default tag color color' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'enter hex color' }), { target: { value: 'ff0000' } });
      expect(onChange).toHaveBeenLastCalledWith({
        columnSettings: [{ name: 'column_0', tags: { colorMode: 'manual', defaultColor: '#ff0000' } }],
      });
    });

    it('clears the default tag color', () => {
      const onChange = vi.fn();
      renderTableColumnsEditor(
        {
          columnSettings: [
            { name: 'column_0', tags: { delimiter: ',', colorMode: 'manual', defaultColor: '#9e9e9e' } },
          ],
        },
        onChange,
      );
      expand();
      fireEvent.click(screen.getByRole('button', { name: 'change Default tag color color' }));
      fireEvent.click(screen.getByTestId('DeleteIcon').closest('button')!);
      expect(onChange).toHaveBeenLastCalledWith({
        columnSettings: [{ name: 'column_0', tags: { delimiter: ',', colorMode: 'manual' } }],
      });
    });

    it('hides tag controls in visualization mode', () => {
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0', plugin: { kind: 'StatChart', spec: {} } }] });
      expand();
      expect(screen.queryByRole('textbox', { name: /Delimiter/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Color mode' })).not.toBeInTheDocument();
    });

    it('hides tag controls in text mode', () => {
      renderTableColumnsEditor({ columnSettings: [{ name: 'column_0' }] });
      expand();
      expect(screen.queryByRole('textbox', { name: /Delimiter/i })).not.toBeInTheDocument();
    });
  });
});
