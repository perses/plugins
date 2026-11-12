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

import type { DatasourceSelector } from '@perses-dev/spec';

import type { CloudWatchDimensions } from '../../model';

export interface CloudWatchDimensionValuesVariableSpec {
  datasource?: DatasourceSelector;
  namespace: string;
  metricName?: string;
  // dimensionKey is the dimension whose values are the options of the variable, for example InstanceId.
  dimensionKey: string;
  // dimensions filters the metrics on other dimension values, for example {"AutoScalingGroupName": "$asg"}.
  dimensions?: CloudWatchDimensions;
}
