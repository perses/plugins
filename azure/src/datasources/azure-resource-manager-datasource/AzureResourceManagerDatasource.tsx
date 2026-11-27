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

import { UserFriendlyError } from '@perses-dev/client';
import type { DatasourcePlugin } from '@perses-dev/plugin-system';

import type {
  AzureResourceManagerDatasourceSpec,
  AzureResourceManagerDatasourceClient,
  ResourceGraphQueryRequestParameters,
  AzureResourceGraphApiRequestBody,
  AzureResourceGraphApiSuccessResponseBody,
  AzureResourceGraphApiErrorResponseBody,
} from './azure-resource-manager-datasource-types';
import { AzureResourceManagerDatasourceEditor } from './AzureResourceManagerDatasourceEditor';
import { AZURE_RESOURCE_GRAPH_API_VERSION, AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT } from './constants';

const createClient: DatasourcePlugin<
  AzureResourceManagerDatasourceSpec,
  AzureResourceManagerDatasourceClient
>['createClient'] = (spec, options) => {
  const { directUrl, proxy, maxRequestsPerQuery } = spec;
  const { proxyUrl } = options;

  // Use the direct URL if specified, but fallback to the proxyUrl by default if not specified
  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error(
      'No URL specified for AzureResourceManagerDatasource client. You can use directUrl in the spec to configure it.',
    );
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    resourceGraphQuery: async (resourceGraphParams, headers) => {
      let url = `${datasourceUrl}/providers/Microsoft.ResourceGraph/resources`;
      url += '?' + new URLSearchParams({ 'api-version': AZURE_RESOURCE_GRAPH_API_VERSION });

      const fetchPages = async (
        skipToken: string | undefined,
        requestsRemaining: number,
      ): Promise<{ responses: AzureResourceGraphApiSuccessResponseBody[]; truncated: boolean }> => {
        if (requestsRemaining <= 0) {
          return { responses: [], truncated: skipToken !== undefined };
        }

        const init = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(headers ?? specHeaders) },
          body: JSON.stringify(buildResourceGraphRequestBody(resourceGraphParams, skipToken)),
        };
        const response = await globalThis.fetch(url, init);
        if (!response.ok) {
          let errorMessage = `Azure resource graph request failed with status ${response.status}`;
          try {
            const errorBody: AzureResourceGraphApiErrorResponseBody = await response.json();
            errorMessage += `: ${errorBody.error.code} - ${errorBody.error.message}`;
          } catch {
            // Response body wasn't valid JSON matching the expected error shape; fall back to the generic message.
          }
          throw new UserFriendlyError(errorMessage, response.status);
        }

        const successBody: AzureResourceGraphApiSuccessResponseBody = await response.json();
        if (successBody.$skipToken === undefined) {
          return { responses: [successBody], truncated: false };
        }

        const nextPage = await fetchPages(successBody.$skipToken, requestsRemaining - 1);
        return { responses: [successBody, ...nextPage.responses], truncated: nextPage.truncated };
      };

      const { responses, truncated } = await fetchPages(
        undefined,
        maxRequestsPerQuery ?? AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT,
      );

      return {
        data: responses.flatMap((response) => response.data),
        warning: truncated ? 'Query result truncated due to max requests per query limit.' : undefined,
      };
    },
  };
};

export const AzureResourceManagerDatasource: DatasourcePlugin<
  AzureResourceManagerDatasourceSpec,
  AzureResourceManagerDatasourceClient
> = {
  createClient,
  OptionsEditorComponent: AzureResourceManagerDatasourceEditor,
  createInitialOptions: () => ({
    directUrl: '',
    maxRequestsPerQuery: AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT,
  }),
};

function buildResourceGraphRequestBody(
  resourceGraphParams: ResourceGraphQueryRequestParameters,
  skipToken?: string,
): AzureResourceGraphApiRequestBody {
  return {
    query: resourceGraphParams.kqlQuery,
    managementGroups: resourceGraphParams.managementGroups,
    subscriptions: resourceGraphParams.subscriptions,
    options: skipToken ? { $skipToken: skipToken } : undefined,
  };
}
