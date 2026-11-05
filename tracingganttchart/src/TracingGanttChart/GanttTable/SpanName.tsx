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

import { Box, Stack } from '@mui/material';
import AlertIcon from 'mdi-material-ui/AlertCircleOutline';
import type { ReactElement } from 'react';
import { useCallback } from 'react';

import type { CustomLinks } from '../../gantt-chart-model';
import type { Span } from '../trace';
import { spanHasError } from '../utils';
import { SpanCheckbox } from './SpanCheckbox';
import { SpanIndents } from './SpanIndents';
import { SpanLinksButton } from './SpanLinksButton';

export interface SpanNameProps {
  customLinks?: CustomLinks;
  span: Span;
  nameColumnWidth: number;
  /** render a checkbox to select the span, if defined */
  checked?: boolean;
  onCheckedChange?: (span: Span) => void;
}

/**
 * SpanName renders the entire left column of a SpanRow, i.e. the selection checkbox, the hierarchy and the service and span name
 */
export function SpanName(props: SpanNameProps): ReactElement {
  const { customLinks, span, nameColumnWidth, checked, onCheckedChange } = props;
  const handleCheckedChange = useCallback(() => onCheckedChange?.(span), [onCheckedChange, span]);

  return (
    <Stack direction="row" sx={{ alignItems: 'center' }} style={{ width: `${nameColumnWidth * 100}%` }}>
      {checked !== undefined && (
        <SpanCheckbox
          checked={checked}
          onChange={handleCheckedChange}
          aria-label={`select span ${span.resource.serviceName}: ${span.name}`}
        />
      )}
      <SpanIndents span={span} />
      {spanHasError(span) && <AlertIcon titleAccess="error" color="error" sx={{ marginRight: '5px' }} />}
      <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <strong>{span.resource.serviceName}:</strong> {span.name}
      </Box>
      {customLinks && customLinks.links.span && span.links.length > 0 && (
        <Box sx={{ marginLeft: 'auto', px: 1 }}>
          <SpanLinksButton customLinks={customLinks} span={span} />
        </Box>
      )}
    </Stack>
  );
}
