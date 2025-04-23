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
import React, { ReactElement } from 'react';
import { StatusHistoryData } from './StatusHistoryChart';

interface CustomTooltipProps {
  data: StatusHistoryData;
  label?: string;
  marker: string;
  xAxisCategories: number[];
  yAxisCategories: string[];
  theme: Theme;
}

export function StatusHistoryTooltip({
  data,
  label,
  marker,
  xAxisCategories,
  yAxisCategories,
  theme,
}: CustomTooltipProps): ReactElement {
  const [x, y] = data;
  const xAxisLabel = xAxisCategories[x];

  const { formattedDate, formattedTime } = getDateAndTime(xAxisLabel);

  return (
    <div>
      <div
        style={{
          borderBottom: `1px solid ${theme.palette.grey[500]}`,
          paddingBottom: '8px',
        }}
      >
        {formattedDate} {formattedTime}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '8px',
        }}
      >
        <div style={{ marginRight: '16px' }}></div>
        {marker}
        <strong>{yAxisCategories[y]}</strong>
      </div>
      <div>{label}</div>
    </div>
  );
}
