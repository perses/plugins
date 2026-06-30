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

import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import MagnifyIcon from 'mdi-material-ui/Magnify';
import { ReactElement, useMemo, useState } from 'react';
import { useTimeZone } from '@perses-dev/components';
import { formatDuration } from './utils';
import { Trace } from './trace';
import { SearchBar, SpanSearch } from './Search';

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  fractionalSecondDigits: 3,
};
const dateFormatterUTC = new Intl.DateTimeFormat(undefined, {
  ...DATE_FORMAT_OPTIONS,
  timeZone: 'UTC',
  timeZoneName: 'short',
}).format;

export interface TraceHeaderBarProps {
  trace: Trace;
  search: SpanSearch;
}

export function TraceHeaderBar(props: TraceHeaderBarProps): ReactElement {
  const { trace, search } = props;

  const { dateFormatOptionsWithUserTimeZone } = useTimeZone();
  const dateFormatter = useMemo(() => {
    const dateFormatOptions = dateFormatOptionsWithUserTimeZone(DATE_FORMAT_OPTIONS);
    return new Intl.DateTimeFormat(undefined, dateFormatOptions).format;
  }, [dateFormatOptionsWithUserTimeZone]);
  const [showSearch, setShowSearch] = useState(false);

  const rootSpan = trace.rootSpans[0];
  if (!rootSpan) {
    return <Typography>Trace contains no spans.</Typography>;
  }

  return (
    <Stack direction="column" sx={{ gap: 1 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Typography variant="h3">
            {rootSpan.resource.serviceName}: {rootSpan.name} (
            {formatDuration(trace.endTimeUnixMs - trace.startTimeUnixMs)})
          </Typography>
          <IconButton size="small" onClick={() => setShowSearch((prev) => !prev)} aria-label="Toggle search">
            <MagnifyIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Typography variant="h4">
          <Typography component="span" sx={{ px: 1 }}>
            <strong>Start:</strong>{' '}
            <Tooltip title={dateFormatterUTC(trace.startTimeUnixMs)} placement="top" arrow>
              <Typography component="span">{dateFormatter(trace.startTimeUnixMs)}</Typography>
            </Tooltip>
          </Typography>
          <Typography component="span" sx={{ px: 1 }}>
            <strong>Trace ID:</strong> {rootSpan.traceId}
          </Typography>
        </Typography>
      </Stack>
      {showSearch && <SearchBar search={search} />}
    </Stack>
  );
}
