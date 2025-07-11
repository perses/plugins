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

import { Stack } from '@mui/material';
import { InfoTooltip, ToolbarIconButton } from '@perses-dev/components';
import { otlptracev1 } from '@perses-dev/core';
import DownloadIcon from 'mdi-material-ui/DownloadOutline';
import { useCallback } from 'react';

interface ToolbarProps {
  trace: otlptracev1.TracesData;
}

export function Toolbar(props: ToolbarProps) {
  const { trace } = props;

  return (
    <Stack direction="row" sx={{ justifyContent: 'flex-end' }} spacing={1}>
      <DownloadTraceButton trace={trace} />
    </Stack>
  );
}

interface DownloadTraceButtonProps {
  trace: otlptracev1.TracesData;
}

function DownloadTraceButton(props: DownloadTraceButtonProps) {
  const { trace } = props;

  const handleClick = useCallback(() => {
    const data = JSON.stringify(trace, null, 2);
    const filename = getFilename(trace);
    downloadFile(filename, 'application/json', data);
  }, [trace]);

  return (
    <InfoTooltip description="download OTLP/JSON trace">
      <ToolbarIconButton aria-label="download OTLP/JSON trace" onClick={handleClick}>
        <DownloadIcon />
      </ToolbarIconButton>
    </InfoTooltip>
  );
}

// exported for tests only.
export function getFilename(trace: otlptracev1.TracesData) {
  const traceId = getTraceId(trace);

  // Trace IDs can be encoded in hex or base64 format.
  // They are 16 bytes per OpenTelemetry spec, i.e. 32 characters in hex encoding.
  // For base64 encoding, the encoded length is always smaller than 32.
  if (!traceId) {
    return 'trace.json';
  } else if (traceId.length === 32) {
    return `${traceId}.json`;
  } else {
    return `${base64ToHex(traceId)}.json`;
  }
}

// A trace can only contain spans with the same trace id. Therefore, let's return the trace id of the first span.
function getTraceId(trace: otlptracev1.TracesData): string | undefined {
  for (const resourceSpan of trace.resourceSpans) {
    for (const scopeSpan of resourceSpan.scopeSpans) {
      for (const span of scopeSpan.spans) {
        return span.traceId;
      }
    }
  }
  return undefined;
}

function base64ToHex(str: string) {
  try {
    return atob(str)
      .split('')
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return str;
  }
}

function downloadFile(filename: string, type: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));

  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}
