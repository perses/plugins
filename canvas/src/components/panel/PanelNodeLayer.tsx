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

import { ReactElement, useCallback } from 'react';
import { TimeSeries } from '@perses-dev/core';
import { replaceVariablesInString, useAllVariableValues } from '@perses-dev/plugin-system';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { CanvasSpec } from '../../model';
import { NodeRenderer } from '../shared/NodeRenderer';
import { colorFromThresholds, interpolateLabel } from '../../utils/panelUtils';

interface PanelNodeLayerProps {
  spec: CanvasSpec;
  seriesByQueryIndex: Map<number, TimeSeries>;
  k: number;
  paletteColors: string[];
}

export function PanelNodeLayer({ spec, seriesByQueryIndex, k, paletteColors }: PanelNodeLayerProps): ReactElement {
  const nodes = spec.nodes ?? [];
  const variableValues = useAllVariableValues();
  const { connection: fallbackColor, nodeDefaultFill } = useCanvasTheme();

  const handleNodeClick = useCallback(
    (link: string) => {
      window.open(replaceVariablesInString(link, variableValues), '_blank', 'noopener,noreferrer');
    },
    [variableValues]
  );

  return (
    <>
      {nodes.map((node) => {
        let labelOverride: string | undefined;
        let fillOverride: string | undefined;

        const series = node.queryIndex !== undefined ? seriesByQueryIndex.get(node.queryIndex) : undefined;
        if (series && node.label) {
          labelOverride = interpolateLabel(node.label, series, spec.format);
        }
        if (node.colorMode === 'fixed' && node.color) {
          fillOverride = node.color;
        } else if (node.colorMode === 'threshold' && spec.thresholds) {
          const lastTuple = series?.values[series.values.length - 1];
          const lastValue = lastTuple?.[1];
          if (lastValue !== null && lastValue !== undefined) {
            fillOverride = colorFromThresholds(lastValue, spec.thresholds, paletteColors, fallbackColor);
          }
        }
        const { link } = node;
        return (
          <NodeRenderer
            key={node.id}
            node={node}
            defaultFill={nodeDefaultFill}
            groupProps={link ? { onClick: () => handleNodeClick(link), style: { cursor: 'pointer' } } : undefined}
            rectProps={{ strokeWidth: 2 / k }}
            labelOverride={labelOverride}
            fillOverride={fillOverride}
          />
        );
      })}
    </>
  );
}
