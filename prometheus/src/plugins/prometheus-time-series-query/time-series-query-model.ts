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

import type { DatasourceSelectValue } from '@perses-dev/plugin-system';
import type { DurationString } from '@perses-dev/spec';

import type { PrometheusDatasourceSelector } from '../../model';
/**
 * The spec/options for the PrometheusTimeSeriesQuery plugin.
 */
export interface PrometheusTimeSeriesQuerySpec {
  query: string;
  seriesNameFormat?: string;
  minStep?: DurationString;
  resolution?: number;
  instant?: boolean;
  /**
   * Per-query toggle for the exemplars feature. Exemplars must be enabled on the
   * selected datasource (`exemplars.enable`); this toggle cannot turn them on for
   * a datasource that has them disabled. `undefined` (Auto) follows the datasource
   * setting, `true` (On) fetches them when the datasource allows it, and `false`
   * (Off) skips fetching for this query. Exemplars are only fetched for range queries.
   */
  enableExemplars?: boolean;
  datasource?: DatasourceSelectValue<PrometheusDatasourceSelector>;
}
