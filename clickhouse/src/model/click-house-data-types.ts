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

import { TimeSeriesData } from '@perses-dev/core';

export interface LogLabels {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: number;
  labels: LogLabels;
  line?: string;
}

export interface LogsData {
  entries: LogEntry[];
  totalCount: number;
  hasMore?: boolean;
}

export interface ClickHouseTimeSeriesData extends TimeSeriesData {
  logs?: LogsData;
}

export interface TimeSeriesEntry {
  time: string;
  log_count: number | string;
}
