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

import { DatasourceSelector } from '@perses-dev/core';

export type InfluxDBQueryLanguage = 'influxql' | 'sql' | 'flux';

export interface InfluxDBTimeSeriesQuerySpec {
  datasource?: DatasourceSelector;
  query: string;
  // 'influxql' for v1, 'sql' or 'flux' for v3 (defaults to 'influxql' for v1, 'sql' for v3)
  queryLanguage?: InfluxDBQueryLanguage;
}
