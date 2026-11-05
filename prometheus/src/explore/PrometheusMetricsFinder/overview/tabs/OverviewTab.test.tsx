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

import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';

import { DEFAULT_PROM } from '../../../../model/prometheus-selectors';
import { useMetricMetadata } from '../../utils';
import { OverviewTab } from './OverviewTab';

vi.mock('../../utils', () => ({
  useMetricMetadata: vi.fn(),
  useSeriesStates: vi.fn().mockReturnValue({
    series: [],
    labelValueCounters: new Map(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

const renderTab = (isMetadataEnabled?: boolean): RenderResult =>
  render(
    <OverviewTab
      metricName="metric1"
      datasource={DEFAULT_PROM}
      filters={[]}
      isMetadataEnabled={isMetadataEnabled}
      onFilterAdd={vi.fn()}
    />,
  );

describe('OverviewTab', () => {
  beforeEach(() => {
    vi.mocked(useMetricMetadata).mockReset();
  });

  it('should fetch metadata by default and display it', () => {
    vi.mocked(useMetricMetadata).mockReturnValue({
      metadata: { type: 'gauge', help: 'my super metric desc' },
      isPending: false,
      error: null,
    });

    renderTab();

    expect(useMetricMetadata).toHaveBeenCalledWith('metric1', DEFAULT_PROM, true);
    expect(screen.getByText('gauge')).toBeInTheDocument();
    expect(screen.getByText('my super metric desc')).toBeInTheDocument();
  });

  it('should not fetch metadata nor show skeletons when metadata is disabled', () => {
    // A disabled TanStack query stays pending forever.
    vi.mocked(useMetricMetadata).mockReturnValue({ metadata: undefined, isPending: true, error: null });

    const { container } = renderTab(false);

    expect(useMetricMetadata).toHaveBeenCalledWith('metric1', DEFAULT_PROM, false);
    expect(container.querySelector('.MuiSkeleton-root')).toBeNull();
    expect(screen.getAllByText('unknown')).toHaveLength(2);
  });
});
