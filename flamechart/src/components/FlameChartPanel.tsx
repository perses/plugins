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
import { useChartsTheme } from '@perses-dev/components';
import { Stack, Typography, SxProps } from '@mui/material';
import { FC, useState, useEffect } from 'react';
import { ProfileData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import { FlameChartOptions } from '../flame-chart-model';
import { FlameChart } from './FlameChart';
import { Settings } from './Settings';
import { Table } from './Table';

export type FlameChartPanelProps = PanelProps<FlameChartOptions, ProfileData>;

export const FlameChartPanel: FC<FlameChartPanelProps> = (props) => {
  const { contentDimensions, queryResults, spec } = props;

  // This spec is used to manage settings temporarily
  const [liveSpec, setLiveSpec] = useState<FlameChartOptions>(spec);

  // keep liveSpec up to date
  useEffect(() => {
    setLiveSpec(spec);
  }, [spec]);

  // selectedId equals 0 => Flame Graph is not zoomed in
  // selectedId different from 0 => Flame Graph is zommed in
  const [selectedId, setSelectedId] = useState(0);

  const chartsTheme = useChartsTheme();
  const flameChartData = queryResults[0];

  if (contentDimensions === undefined) return null;

  const noDataTextStyle = (chartsTheme.noDataOption.title as TitleComponentOption).textStyle as SxProps;

  const onChangePalette = (newPalette: 'package-name' | 'value') => {
    setLiveSpec((prev) => {
      return { ...prev, palette: newPalette };
    });
  };

  const onDisplayChange = (value: 'table' | 'flame-graph' | 'both' | 'none') => {
    let showTable = true;
    let showFlameGraph = true;
    if (value === 'table') {
      showFlameGraph = false;
    } else if (value === 'flame-graph') {
      showTable = false;
    }
    setLiveSpec((prev) => {
      return { ...prev, showTable: showTable, showFlameGraph: showFlameGraph };
    });
  };

  const OPTIONS_SPACE = liveSpec.showSettings ? 35 : 0; // space for options at the top of the chart

  return (
    <Stack
      height={contentDimensions.height}
      width={contentDimensions.width}
      justifyContent="center"
      alignItems="center"
    >
      {queryResults.length > 1 ? (
        // display a message if there is more than one query
        <Typography sx={{ ...noDataTextStyle }}>
          There is more than one query. Please make sure that you provided only one query.
        </Typography>
      ) : flameChartData ? (
        // Convert the server response into the opentelemetry format
        <Stack sx={{ paddingTop: '10px' }}>
          {liveSpec.showSettings && (
            <Settings
              onSelectedIdChange={setSelectedId}
              onChangePalette={onChangePalette}
              onDisplayChange={onDisplayChange}
              value={liveSpec}
              selectedId={selectedId}
            />
          )}
          <Stack direction="row" justifyContent="center" alignItems="top">
            {liveSpec.showTable && (
              <Table
                width={liveSpec.showFlameGraph ? 0.4 * contentDimensions.width : contentDimensions.width}
                height={contentDimensions.height - OPTIONS_SPACE}
                data={flameChartData.data}
              />
            )}
            {liveSpec.showFlameGraph && (
              <FlameChart
                width={liveSpec.showTable ? 0.6 * contentDimensions.width : contentDimensions.width}
                height={contentDimensions.height - OPTIONS_SPACE}
                data={flameChartData.data}
                palette={liveSpec.palette}
                selectedId={selectedId}
                onSelectedIdChange={setSelectedId}
              />
            )}
          </Stack>
        </Stack>
      ) : (
        <Typography sx={{ ...noDataTextStyle }}>No data</Typography>
      )}
    </Stack>
  );
};
