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

import { Box } from '@mui/material';
import type { ReactElement } from 'react';

export interface QueryExamplesProps {
  /** Commented SQL statements showing what the queries of a plugin look like. */
  examples: string;
}

/** QueryExamples is a foldable block of example queries. */
export function QueryExamples({ examples }: QueryExamplesProps): ReactElement {
  return (
    <details>
      <Box component="summary" sx={{ cursor: 'pointer', fontSize: '12px', color: 'text.secondary', mb: 1 }}>
        Query Examples
      </Box>
      <Box
        component="pre"
        sx={(theme) => ({
          margin: 0,
          fontSize: '11px',
          color: theme.palette.text.secondary,
          backgroundColor: theme.palette.background.default,
          padding: '8px',
          borderRadius: '4px',
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.3',
        })}
      >
        {examples}
      </Box>
    </details>
  );
}
