// Copyright 2023 The Perses Authors
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

import { TitleComponentOption } from 'echarts';
import { useChartsTheme, FlameChart } from '@perses-dev/components';
import { Stack, Typography, SxProps } from '@mui/material';
import { FC } from 'react';
import { ProfileData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import { FlameChartOptions } from './flame-chart-model';

// const MIN_WIDTH = 100;
const SPACING = 2;

export type FlameChartPanelProps = PanelProps<FlameChartOptions, ProfileData>;

export const FlameChartPanel: FC<FlameChartPanelProps> = (props) => {
  const { contentDimensions, queryResults } = props;

  // const { content } = spec;
  const chartsTheme = useChartsTheme();
  const flameChartData = queryResults[0];

  if (contentDimensions === undefined) return null;

  const noDataTextStyle = (chartsTheme.noDataOption.title as TitleComponentOption).textStyle;

  return (
    <Stack
      height={contentDimensions.height}
      width={contentDimensions.width}
      spacing={`${SPACING}px`}
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      {flameChartData ? (
        // Convert the server response into the opentelemetry format
        <FlameChart
          width={contentDimensions.width}
          height={contentDimensions.height}
          data={flameChartData.data.profile}
        />
      ) : (
        <Typography sx={{ ...noDataTextStyle } as SxProps}>No data</Typography>
      )}
    </Stack>
  );
};
