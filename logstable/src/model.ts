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

import { LogData, ThresholdOptions } from '@perses-dev/core';
import { PanelProps, LegendSpecOptions } from '@perses-dev/plugin-system';

export type LogsTableProps = PanelProps<LogsTableOptions, LogsQueryData>;

export interface LogsQueryData {
  logs?: LogData;
}

export interface LogsTableOptions {
  legend?: LegendSpecOptions;
  thresholds?: ThresholdOptions;
  allowWrap?: boolean;
  enableDetails?: boolean;
  showTime?: boolean;
  showAll?: boolean;
}
