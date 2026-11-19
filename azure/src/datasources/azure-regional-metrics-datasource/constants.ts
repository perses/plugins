// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// https://learn.microsoft.com/en-us/rest/api/monitor/metrics-batch/batch?view=rest-monitor-2023-10-01&tabs=HTTP
export const AZURE_METRICS_BATCH_API_VERSION = '2023-10-01';

// Metrics for only 50 resource IDs can be requested from Azure at a time.
export const AZURE_METRICS_BATCH_MAX_RESOURCE_IDS_PER_BATCH = 50;
// After that, multiple requests are required to collect metrics for all resources.
export const AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT = 20; // 20*50 = 1000 resources

export const DATASOURCE_KIND = 'AzureRegionalMetricsDatasource';
