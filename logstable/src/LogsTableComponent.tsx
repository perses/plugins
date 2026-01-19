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

import { ReactElement } from 'react';
import { Box, Typography } from '@mui/material';
import { LogsTableProps } from './model';
import { LogsList } from './components/LogsList';

export function LogsTableComponent(props: LogsTableProps): ReactElement | null {
  const { queryResults, spec, contentDimensions } = props;

  // all queries results must be included
  const logs = queryResults
    .flatMap((result) => result?.data.logs?.entries ?? [])
    .sort((a, b) => b.timestamp - a.timestamp);

  if (!logs.length) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Typography>No logs to display</Typography>
      </Box>
    );
  }

  return <LogsList logs={logs} spec={spec} contentDimensions={contentDimensions} />;
}
