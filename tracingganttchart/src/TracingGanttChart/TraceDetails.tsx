// Copyright 2025 The Perses Authors
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

import { Stack, Typography } from '@mui/material';
import { ReactElement } from 'react';
import { useTimeZone } from '@perses-dev/components';
import { formatDuration } from './utils';
import { Trace } from './trace';

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  fractionalSecondDigits: 3,
  timeZoneName: 'short',
};

export interface TraceDetailsProps {
  trace: Trace;
}

export function TraceDetails(props: TraceDetailsProps): ReactElement {
  const { trace } = props;

  const { dateFormatOptionsWithUserTimeZone } = useTimeZone();
  const dateFormatOptions = dateFormatOptionsWithUserTimeZone(DATE_FORMAT_OPTIONS);
  const dateFormatter = new Intl.DateTimeFormat(undefined, dateFormatOptions);

  const rootSpan = trace.rootSpans[0];
  if (!rootSpan) {
    return <Typography>Trace contains no spans.</Typography>;
  }

  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography variant="h3">
        {rootSpan.resource.serviceName}: {rootSpan.name} ({formatDuration(trace.endTimeUnixMs - trace.startTimeUnixMs)})
      </Typography>
      <Typography variant="h4">
        <Typography component="span" sx={{ px: 1 }}>
          <strong>Start:</strong> {dateFormatter.format(trace.startTimeUnixMs)}
        </Typography>
        <Typography component="span" sx={{ px: 1 }}>
          <strong>Trace ID:</strong> {rootSpan.traceId}
        </Typography>
      </Typography>
    </Stack>
  );
}
