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

import { TimeSeriesQueryDefinition, DatasourceSelector } from '@perses-dev/core';

export interface SQLTimeSeriesQuerySpec {
  // Datasource selector
  datasource?: DatasourceSelector;

  // SQL query to execute
  query: string;

  // Time column name in the result set
  timeColumn?: string;

  // Value columns to extract as metrics
  valueColumns?: string[];

  // Label columns for series differentiation
  labelColumns?: string[];

  // Minimum step/interval for the query
  minStep?: number;

  // Format of the time column (iso8601, unix, unix_ms, etc.)
  timeFormat?: 'iso8601' | 'unix' | 'unix_ms';
}

export type SQLTimeSeriesQueryDefinition = TimeSeriesQueryDefinition<SQLTimeSeriesQuerySpec>;
