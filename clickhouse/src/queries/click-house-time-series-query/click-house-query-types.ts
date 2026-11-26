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

import type { ClickHouseQuerySpec } from '../../model/execute-query';

export interface ClickHouseTimeSeriesQuerySpec extends ClickHouseQuerySpec {
  /**
   * Format of the names of the series, e.g. `{{ServiceName}} - {{SpanName}}`: each `{{label}}` is replaced by the
   * value of the label of the series.
   */
  seriesNameFormat?: string;
  /**
   * Query returning the exemplars of the series. Each row is an exemplar: a time column, a `value` column, the label
   * columns of the series it belongs to, and any other column, such as `trace_id`, as a label of the exemplar.
   */
  exemplarQuery?: string;
  /**
   * Lower bound of the interval of the query, which is the value of the `$__interval_s` family of macros: a duration
   * such as `1m`, or a variable holding one. Typically the interval the data is written at, when a panel asks for a
   * shorter one.
   */
  minStep?: string;
}
