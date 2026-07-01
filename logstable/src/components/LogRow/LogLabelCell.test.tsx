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
import { LogLabelCell } from './LogLabelCell';

describe('LogLabelCell', () => {
  it('should render the value text', () => {
    render(<LogLabelCell value="my-service" allowWrap={false} />);
    expect(screen.getByText('my-service')).toBeInTheDocument();
  });

  it('should render em-dash when value is undefined', () => {
    render(<LogLabelCell value={undefined} allowWrap={false} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should apply nowrap styles when allowWrap is false', () => {
    render(<LogLabelCell value="some-value" allowWrap={false} />);
    const el = screen.getByText('some-value');
    expect(el).toHaveStyle({ whiteSpace: 'nowrap' });
  });

  it('should apply wrap styles when allowWrap is true', () => {
    render(<LogLabelCell value="some-value" allowWrap={true} />);
    const el = screen.getByText('some-value');
    expect(el).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });

  it('should render with monospace font', () => {
    render(<LogLabelCell value="test" allowWrap={false} />);
    const el = screen.getByText('test');
    expect(el).toHaveStyle({ fontSize: '12px' });
  });
});
