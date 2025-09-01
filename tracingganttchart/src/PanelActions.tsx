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

import { InfoTooltip } from '@perses-dev/components';
import { otlptracev1 } from '@perses-dev/core';
import DownloadIcon from 'mdi-material-ui/DownloadOutline';
import { useCallback } from 'react';
import { HeaderIconButton } from '@perses-dev/dashboards';
import { TracingGanttChartPanelProps } from './TracingGanttChartPanel';

export function DownloadTraceAction(props: TracingGanttChartPanelProps) {
  const { queryResults } = props;
  const trace = queryResults[0]?.data?.trace;

  const handleClick = useCallback(() => {
    if (!trace) return;

    const data = JSON.stringify(trace, null, 2);
    const filename = getFilename(trace);
    downloadFile(filename, 'application/json', data);
  }, [trace]);

  if (!trace) {
    return null;
  }

  return (
    <InfoTooltip description="download OTLP/JSON trace">
      <HeaderIconButton aria-label="download OTLP/JSON trace" size="small" onClick={handleClick}>
        <DownloadIcon fontSize="inherit" />
      </HeaderIconButton>
    </InfoTooltip>
  );
}

/**
 * A trace can only contain spans with the same trace id. Therefore, let's return the trace id of the first span.
 * Exported for tests only.
 */
export function getFilename(trace: otlptracev1.TracesData) {
  for (const resourceSpan of trace.resourceSpans) {
    for (const scopeSpan of resourceSpan.scopeSpans) {
      for (const span of scopeSpan.spans) {
        return `${span.traceId}.json`;
      }
    }
  }

  return 'trace.json';
}

function downloadFile(filename: string, type: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));

  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}
