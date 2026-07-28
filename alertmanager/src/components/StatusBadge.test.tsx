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
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  describe('alert variant', () => {
    it('renders "Firing" for firing state', () => {
      render(<StatusBadge status="firing" variant="alert" />);
      expect(screen.getByText('Firing')).toBeInTheDocument();
    });

    it('renders "Silenced" for suppressed state', () => {
      render(<StatusBadge status="suppressed" variant="alert" />);
      expect(screen.getByText('Silenced')).toBeInTheDocument();
    });

    it('renders "Pending" for pending state', () => {
      render(<StatusBadge status="pending" variant="alert" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('defaults to alert variant when variant is omitted', () => {
      render(<StatusBadge status="firing" />);
      expect(screen.getByText('Firing')).toBeInTheDocument();
    });
  });

  describe('silence variant', () => {
    it('renders "Active" for active state', () => {
      render(<StatusBadge status="active" variant="silence" />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders "Expired" for expired state', () => {
      render(<StatusBadge status="expired" variant="silence" />);
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('renders "Pending" for pending state', () => {
      render(<StatusBadge status="pending" variant="silence" />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('renders unknown status as-is', () => {
    render(<StatusBadge status="unknown-state" variant="alert" />);
    expect(screen.getByText('unknown-state')).toBeInTheDocument();
  });
});
