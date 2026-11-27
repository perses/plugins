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

import { render, screen } from '@testing-library/react';

import { TagsCell } from './TagsCell';

describe('TagsCell', () => {
  it('does not crash on colors the theme cannot parse', () => {
    render(
      <TagsCell
        tags={[
          { label: 'a', backgroundColor: 'ff0000' },
          { label: 'b', backgroundColor: 'red' },
        ]}
      />,
    );
    expect(screen.getAllByTestId('table-tag')).toHaveLength(2);
  });

  it('fits the tags in the cell height for every table density', () => {
    render(<TagsCell tags={[{ label: 'a', backgroundColor: '#000000' }]} />);
    // The cell content height depends on the density (18px compact, 20px standard), a small Chip is 24px by default
    expect(screen.getByTestId('table-tags')).toHaveStyle({ height: '100%' });
    expect(screen.getByTestId('table-tag')).toHaveStyle({ height: '100%', maxHeight: '24px' });
  });

  it('uses a contrast text color for parseable colors', () => {
    render(<TagsCell tags={[{ label: 'a', backgroundColor: '#000000' }]} />);
    expect(screen.getByTestId('table-tag')).toHaveStyle({ color: '#fff' });
  });
});
