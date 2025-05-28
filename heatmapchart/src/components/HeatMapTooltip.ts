// Copyright 2024 The Perses Authors
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

import { css, Theme } from '@mui/material';
import { getDateAndTime } from '@perses-dev/components';
import { FormatOptions, formatValue } from '@perses-dev/core';
import { HeatMapData } from './HeatMapChart';

interface CustomTooltipProps {
  data: HeatMapData;
  label: string;
  marker: string;
  xAxisCategories: number[];
  yAxisCategories: string[];
  theme: Theme;
  yAxisFormat?: FormatOptions;
  countFormat?: FormatOptions;
}

export function generateTooltipHTML({
  data,
  label,
  marker,
  xAxisCategories,
  yAxisCategories,
  theme,
  yAxisFormat,
  countFormat,
}: CustomTooltipProps): string {
  const [x, y] = data;
  const xAxisLabel = xAxisCategories[x];

  const { formattedDate, formattedTime } = getDateAndTime(xAxisLabel);

  const tooltipHeader = css`
    border-bottom: 1px solid ${theme.palette.grey[500]};
    padding-bottom: 8px;
  `;

  const tooltipContentStyles = css`
    display: flex;
    justify-content: space-between;
    padding-top: 8px;
  `;

  const labelStyles = css`
    margin-right: 16px;
  `;

  const lowerBound = parseFloat(yAxisCategories[y]!);
  const upperBound = yAxisCategories[y + 1]
    ? parseFloat(yAxisCategories[y + 1]!)
    : parseFloat(yAxisCategories[y]!) + parseFloat(yAxisCategories[y]!) - parseFloat(yAxisCategories[y - 1]!); // Top cell, upper bound need to be calculated from previous cell

  return `
    <div>
      <div style="${tooltipHeader.styles}">${formattedDate} ${formattedTime}</div>
      <div style="${tooltipContentStyles.styles}">
        <div style="${labelStyles.styles}">
          ${marker}
          <strong>${formatValue(lowerBound, yAxisFormat)} - ${formatValue(upperBound, yAxisFormat)}</strong>
        </div>
        <div>
          ${formatValue(parseFloat(label), countFormat)}
        </div>
      </div>
    </div>
  `;
}
