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

import { PanelData } from '@perses-dev/plugin-system';
import { QueryDataType, UnknownSpec } from '@perses-dev/core';
import { PanelPluginLoader } from '@perses-dev/dashboards';
import useResizeObserver from 'use-resize-observer';
import { ErrorAlert, ErrorBoundary } from '@perses-dev/components';
import { ReactElement } from 'react';

interface EmbeddedPanelProps {
  kind: string;
  spec: UnknownSpec;
  queryResults: Array<PanelData<QueryDataType>>;
}

export function EmbeddedPanel({ kind, spec, queryResults }: EmbeddedPanelProps): ReactElement {
  const { ref, width = 1, height = 1 } = useResizeObserver<HTMLDivElement>();
  return (
    <div ref={ref} style={{ height: '100%' }}>
      <ErrorBoundary FallbackComponent={ErrorAlert}>
        <PanelPluginLoader kind={kind} contentDimensions={{ width, height }} spec={spec} queryResults={queryResults} />
      </ErrorBoundary>
    </div>
  );
}
