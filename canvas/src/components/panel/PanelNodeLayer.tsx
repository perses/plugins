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

import { replaceVariablesInString, useAllVariableValues } from '@perses-dev/plugin-system';
import type { TimeSeries } from '@perses-dev/spec';
import type { ReactElement } from 'react';
import { useCallback, useMemo } from 'react';

import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import type { CanvasSpec, NodeSpec } from '../../model';
import { colorFromThresholds, interpolateLabel } from '../../utils/panelUtils';
import { NodeRenderer } from '../shared/NodeRenderer';

const POINTER_STYLE = { cursor: 'pointer' };

interface PanelNodeProps {
  node: NodeSpec;
  defaultFill: string;
  rectProps: React.SVGProps<SVGRectElement>;
  labelOverride: string | undefined;
  fillOverride: string | undefined;
  onNodeClick: (url: string) => void;
}

function PanelNode({
  node,
  defaultFill,
  rectProps,
  labelOverride,
  fillOverride,
  onNodeClick,
}: PanelNodeProps): ReactElement {
  const { url } = node;
  const handleClick = useCallback((): void => {
    if (url) onNodeClick(url);
  }, [url, onNodeClick]);

  const groupProps = useMemo(
    () => (url ? { onClick: handleClick, style: POINTER_STYLE } : undefined),
    [url, handleClick],
  );

  return (
    <NodeRenderer
      node={node}
      defaultFill={defaultFill}
      groupProps={groupProps}
      rectProps={rectProps}
      labelOverride={labelOverride}
      fillOverride={fillOverride}
    />
  );
}

interface PanelNodeLayerProps {
  spec: CanvasSpec;
  seriesByQueryIndex: Map<number, TimeSeries>;
  k: number;
  paletteColors: string[];
}

export function PanelNodeLayer({ spec, seriesByQueryIndex, k, paletteColors }: PanelNodeLayerProps): ReactElement {
  const nodes = useMemo(() => spec.nodes ?? [], [spec.nodes]);
  const variableValues = useAllVariableValues();
  const { connection: fallbackColor, nodeDefaultFill } = useCanvasTheme();

  const handleNodeClick = useCallback(
    (url: string) => {
      window.open(replaceVariablesInString(url, variableValues), '_blank', 'noopener,noreferrer');
    },
    [variableValues],
  );

  const rectProps = useMemo(() => ({ strokeWidth: 2 / k }), [k]);

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
        return (
          <PanelNode
            key={node.id}
            node={node}
            defaultFill={nodeDefaultFill}
            rectProps={rectProps}
            labelOverride={labelOverride}
            fillOverride={fillOverride}
            onNodeClick={handleNodeClick}
          />
        );
      })}
    </>
  );
}
