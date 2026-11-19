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

// https://learn.microsoft.com/en-us/rest/api/azureresourcegraph/resourcegraph/resources/resources?view=rest-azureresourcegraph-resourcegraph-2024-04-01&tabs=HTTP
export const AZURE_RESOURCE_GRAPH_API_VERSION = '2024-04-01';

// When there are paginated results, only retrieve this many pages.
// Each page could contain up to 1000 results.
export const AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT = 5;

// There is very little reason for the user to change to a different URL since all the APIs
// require targetting this endpoint to work anyway.
export const AZURE_MANAGEMENT_API_URL = 'https://management.azure.com';

export const DATASOURCE_KIND = 'AzureResourceManagerDatasource';
