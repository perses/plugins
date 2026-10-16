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

export const CLOUDWATCH_DATASOURCE_KIND = 'CloudWatchDatasource';

export const DEFAULT_CLOUDWATCH: DatasourceSelector = { kind: CLOUDWATCH_DATASOURCE_KIND };

// CLOUDWATCH_MAX_QUERIES is the number of queries supported by the editor (CloudWatch accepts up to 500).
export const CLOUDWATCH_MAX_QUERIES = 20;
// CLOUDWATCH_MAX_DATAPOINTS is the datapoints budget of a query: the periods are increased to stay under it,
// so a panel never loads more datapoints than it can display (see getEffectivePeriod).
export const CLOUDWATCH_MAX_DATAPOINTS = 10000;
// CLOUDWATCH_MAX_DISCOVERED_METRICS is the maximum number of metrics returned by a discovery.
export const CLOUDWATCH_MAX_DISCOVERED_METRICS = 1000;
// CLOUDWATCH_MAX_PAGES is the maximum number of pages requested for a single GetMetricData or ListMetrics call.
export const CLOUDWATCH_MAX_PAGES = 10;
export const CLOUDWATCH_MIN_PERIOD = 60;
export const CLOUDWATCH_MAX_PERIOD = 86400;

// The CloudWatch API is called with the AWS JSON 1.0 protocol.
export const CLOUDWATCH_TARGET_PREFIX = 'GraniteServiceVersion20100801.';
export const CLOUDWATCH_CONTENT_TYPE = 'application/x-amz-json-1.0';
