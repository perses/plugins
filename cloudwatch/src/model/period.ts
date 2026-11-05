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

import { CLOUDWATCH_MAX_DATAPOINTS, CLOUDWATCH_MAX_PERIOD, CLOUDWATCH_MIN_PERIOD } from './constants';

/**
 * Returns the period (in seconds) to query a metric.
 * The period of the query is a minimum, like the minimum step of a Prometheus query. It is increased:
 * - to the step suggested by the panel, as more datapoints than pixels are not useful,
 * - so all the returned series fit in the datapoint limit of the CloudWatch proxy, for example over a long time range.
 * The result is rounded up to a multiple of 60 seconds, as required by CloudWatch for standard resolution metrics.
 */
export function getEffectivePeriod(
  period: number,
  rangeSeconds: number,
  returnedSeries: number,
  suggestedStepMs?: number,
): number {
  const pointsPerSeries = Math.max(1, Math.floor(CLOUDWATCH_MAX_DATAPOINTS / Math.max(1, returnedSeries)));
  const minimum = Math.max(
    period,
    CLOUDWATCH_MIN_PERIOD,
    rangeSeconds / pointsPerSeries,
    (suggestedStepMs ?? 0) / 1000,
  );
  return Math.min(CLOUDWATCH_MAX_PERIOD, Math.ceil(minimum / CLOUDWATCH_MIN_PERIOD) * CLOUDWATCH_MIN_PERIOD);
}
