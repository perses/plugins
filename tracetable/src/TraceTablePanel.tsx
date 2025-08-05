// Copyright 2024 The Perses Authors
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

import { PanelProps } from '@perses-dev/plugin-system';
import { Box } from '@mui/material';
import { NoDataOverlay, useChartsTheme } from '@perses-dev/components';
import { TraceData } from '@perses-dev/core';
import { ReactElement } from 'react';
import { DataTable } from './DataTable';
import { TraceTableOptions } from './trace-table-model';

export type TraceTablePanelProps = PanelProps<TraceTableOptions, TraceData>;

export function TraceTablePanel(props: TraceTablePanelProps): ReactElement {
  const { spec, queryResults } = props;

  const chartsTheme = useChartsTheme();
  const contentPadding = chartsTheme.container.padding.default;

  const tracesFound = queryResults.some((traceData) => (traceData.data?.searchResult ?? []).length > 0);
  if (!tracesFound) {
    return <NoDataOverlay resource="traces" />;
  }

  return (
    <Box sx={{ height: '100%', padding: `${contentPadding}px`, overflowY: 'auto' }}>
      <DataTable options={spec} result={queryResults} />
    </Box>
  );
}
