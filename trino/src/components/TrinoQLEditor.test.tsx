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
import { fireEvent, render, screen } from '@testing-library/react';

import { formatTrinoQuery, TrinoQLEditor } from './TrinoQLEditor';

describe('formatTrinoQuery', () => {
  it('keeps Perses variables intact', () => {
    const formatted = formatTrinoQuery(
      "SELECT * FROM t WHERE r = $region AND h IN (${hosts:singlequote}) AND n = '$name'",
    );
    expect(formatted).toContain('r = $region');
    expect(formatted).toContain('(${hosts:singlequote})');
    expect(formatted).toContain("'$name'");
  });

  it('throws on SQL it cannot parse', () => {
    expect(() => formatTrinoQuery('SELECT count(* FROM t')).toThrow();
  });
});

describe('TrinoQLEditor format button', () => {
  it('commits the formatted query through onFormat', () => {
    const onFormat = vi.fn();
    render(<TrinoQLEditor value="select a from t where x = $x" onChange={vi.fn()} onFormat={onFormat} />);

    fireEvent.click(screen.getByRole('button', { name: 'Format Query' }));

    expect(onFormat).toHaveBeenCalledWith(formatTrinoQuery('select a from t where x = $x'));
  });

  it('shows an error instead of throwing on SQL it cannot parse', () => {
    const onFormat = vi.fn();
    render(<TrinoQLEditor value="SELECT count(* FROM t" onChange={vi.fn()} onFormat={onFormat} />);

    fireEvent.click(screen.getByRole('button', { name: 'Format Query' }));

    expect(onFormat).not.toHaveBeenCalled();
    expect(screen.getByText(/Could not format query/)).toBeInTheDocument();
  });
});
