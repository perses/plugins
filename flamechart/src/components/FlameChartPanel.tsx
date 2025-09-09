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
import { Stack, Typography, SxProps, useMediaQuery, useTheme } from '@mui/material';
import { FC, useState, useEffect, useMemo } from 'react';
import { ProfileData, StackTrace } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import { FlameChartOptions } from '../flame-chart-model';
import { filterStackTraceById, getMaxDepth } from '../utils/data-transform';
import { FlameChart } from './FlameChart';
import { Settings } from './Settings';
import { TableChart } from './TableChart';
import { SeriesChart } from './SeriesChart';

const LARGE_PANEL_THRESHOLD = 600;
const DEFAULT_SERIES_CHART_HEIGHT = 200;

export type FlameChartPanelProps = PanelProps<FlameChartOptions, ProfileData>;

export const FlameChartPanel: FC<FlameChartPanelProps> = (props) => {
  const { contentDimensions, queryResults, spec } = props;

  const isMobileSize = useMediaQuery(useTheme().breakpoints.down('sm'));

  // selectedId equals 0 => Flame Graph is not zoomed in
  // selectedId different from 0 => Flame Graph is zoomed in
  const [selectedId, setSelectedId] = useState(0);
  const [searchValue, setSearchValue] = useState('');

  // This spec is used to manage settings temporarily
  const [liveSpec, setLiveSpec] = useState<FlameChartOptions>(spec);

  // keep liveSpec up to date
  useEffect(() => {
    setLiveSpec(spec);
    setSelectedId(0);
    setSearchValue('');
  }, [spec]);

  const chartsTheme = useChartsTheme();
  const flameChartData = useMemo(() => {
    return queryResults[0];
  }, [queryResults]);

  const selectedStackTrace: StackTrace | undefined = useMemo(() => {
    if (!flameChartData) return undefined;
    if (!selectedId) return flameChartData.data.profile.stackTrace;

    return filterStackTraceById(flameChartData.data.profile.stackTrace, selectedId);
  }, [flameChartData, selectedId]);

  const maxDepth: number = useMemo(
    () => (selectedStackTrace ? getMaxDepth(selectedStackTrace) : 0),
    [selectedStackTrace]
  );

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

  if (!contentDimensions) return null;

  const PADDING =
    liveSpec.showSeries && liveSpec.showSettings ? 32 : liveSpec.showSeries || liveSpec.showSettings ? 16 : 0;

  const SETTINGS_HEIGHT = liveSpec.showSettings ? 30 : 0;

  const SERIES_CHART_HEIGHT = liveSpec.showSeries
    ? contentDimensions.height < DEFAULT_SERIES_CHART_HEIGHT
      ? contentDimensions.height
      : DEFAULT_SERIES_CHART_HEIGHT
    : 0;

  const TABLE_FLAME_CHART_HEIGHT = liveSpec.traceHeight
    ? Math.max(
        contentDimensions.height -
          (contentDimensions.height > LARGE_PANEL_THRESHOLD ? SERIES_CHART_HEIGHT + SETTINGS_HEIGHT + PADDING : 0),
        maxDepth * liveSpec.traceHeight
      )
    : contentDimensions.height -
      (contentDimensions.height > LARGE_PANEL_THRESHOLD ? SERIES_CHART_HEIGHT + SETTINGS_HEIGHT + PADDING : 0);

  const TABLE_CHART_WIDTH = isMobileSize
    ? contentDimensions.width
    : liveSpec.showFlameGraph
      ? 0.4 * contentDimensions.width
      : contentDimensions.width;

  const FLAME_CHART_WIDTH = isMobileSize
    ? contentDimensions.width
    : liveSpec.showTable
      ? 0.6 * contentDimensions.width
      : contentDimensions.width;

  // TODO (gladorme): allow users to override height (useful for explorer for stack traces with high depth)
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
        <Stack
          gap={2}
          sx={{
            overflowY: 'auto',
            scrollbarGutter: 'stable both-edges',
            paddingTop: liveSpec.showSettings || liveSpec.showSeries ? 1 : 0,
          }}
        >
          {liveSpec.showSeries && (
            <SeriesChart width={contentDimensions.width} height={SERIES_CHART_HEIGHT} data={flameChartData.data} />
          )}
          {liveSpec.showSettings && (
            <Settings
              onSelectedIdChange={setSelectedId}
              onChangePalette={onChangePalette}
              onDisplayChange={onDisplayChange}
              value={liveSpec}
              selectedId={selectedId}
            />
          )}
          <Stack
            direction={isMobileSize ? 'column' : 'row'}
            justifyContent="center"
            alignItems={isMobileSize ? 'center' : 'top'}
          >
            {liveSpec.showTable && (
              <TableChart
                width={TABLE_CHART_WIDTH}
                height={TABLE_FLAME_CHART_HEIGHT}
                data={flameChartData.data}
                searchValue={searchValue}
                onSearchValueChange={setSearchValue}
                onSelectedIdChange={setSelectedId}
              />
            )}
            {liveSpec.showFlameGraph && (
              <FlameChart
                width={FLAME_CHART_WIDTH}
                height={TABLE_FLAME_CHART_HEIGHT}
                data={flameChartData.data}
                palette={liveSpec.palette}
                selectedId={selectedId}
                searchValue={searchValue}
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
