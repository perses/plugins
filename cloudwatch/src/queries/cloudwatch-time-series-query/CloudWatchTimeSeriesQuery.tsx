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

import type { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';

import type { CloudWatchTimeSeriesQuerySpec } from './cloudwatch-time-series-query-types';
import { CloudWatchTimeSeriesQueryEditor, newMetricQuery } from './CloudWatchTimeSeriesQueryEditor';
import { getCloudWatchTimeSeriesData, getQueryVariables } from './get-cloudwatch-time-series-data';

export const CloudWatchTimeSeriesQuery: TimeSeriesQueryPlugin<CloudWatchTimeSeriesQuerySpec> = {
  getTimeSeriesData: getCloudWatchTimeSeriesData,
  OptionsEditorComponent: CloudWatchTimeSeriesQueryEditor,
  createInitialOptions: () => ({ queries: [newMetricQuery('m1')] }),
  dependsOn: (spec) => ({ variables: getQueryVariables(spec) }),
};
