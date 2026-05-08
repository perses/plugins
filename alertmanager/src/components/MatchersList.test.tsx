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
import { MatchersList } from './MatchersList';

describe('MatchersList', () => {
  it('renders equality matcher as name="value"', () => {
    render(<MatchersList matchers={[{ name: 'alertname', value: 'HighMemory', isEqual: true, isRegex: false }]} />);
    expect(screen.getByText('alertname="HighMemory"')).toBeInTheDocument();
  });

  it('renders negative equality matcher as name!="value"', () => {
    render(<MatchersList matchers={[{ name: 'severity', value: 'info', isEqual: false, isRegex: false }]} />);
    expect(screen.getByText('severity!="info"')).toBeInTheDocument();
  });

  it('renders regex matcher as name=~"value"', () => {
    render(<MatchersList matchers={[{ name: 'instance', value: 'server-.*', isEqual: true, isRegex: true }]} />);
    expect(screen.getByText('instance=~"server-.*"')).toBeInTheDocument();
  });

  it('renders negative regex matcher as name!~"value"', () => {
    render(<MatchersList matchers={[{ name: 'job', value: 'test.*', isEqual: false, isRegex: true }]} />);
    expect(screen.getByText('job!~"test.*"')).toBeInTheDocument();
  });

  it('renders multiple matchers as separate chips', () => {
    render(
      <MatchersList
        matchers={[
          { name: 'alertname', value: 'HighMemory', isEqual: true, isRegex: false },
          { name: 'severity', value: 'critical', isEqual: true, isRegex: false },
        ]}
      />
    );
    expect(screen.getByText('alertname="HighMemory"')).toBeInTheDocument();
    expect(screen.getByText('severity="critical"')).toBeInTheDocument();
  });

  it('renders empty list when no matchers provided', () => {
    const { container } = render(<MatchersList matchers={[]} />);
    // Should render the container but no chips
    expect(container.querySelector('.MuiChip-root')).toBeNull();
  });
});
