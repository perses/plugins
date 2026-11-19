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
  AzureRegionalMetricsDatasourceSpec,
  AzureRegionalMetricsDatasourceClient,
  AzureMetricsBatchQueryRequestOptions,
  AzureMetricsBatchApiSuccessResponseBody,
  AzureMetricsBatchApiErrorResponseBody,
  AzureMetricsBatchApiRequestBody,
} from './azure-regional-metrics-datasource-types';
import { AzureRegionalMetricsDatasourceEditor } from './AzureRegionalMetricsDatasourceEditor';
import {
  AZURE_METRICS_BATCH_API_VERSION,
  AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT,
  AZURE_METRICS_BATCH_MAX_RESOURCE_IDS_PER_BATCH,
} from './constants';

const createClient: DatasourcePlugin<
  AzureRegionalMetricsDatasourceSpec,
  AzureRegionalMetricsDatasourceClient
>['createClient'] = (spec, options) => {
  const { directUrl, proxy, maxRequestsPerQuery } = spec;
  const { proxyUrl } = options;

  // Use the direct URL if specified, but fallback to the proxyUrl by default if not specified
  const datasourceUrl = directUrl ?? proxyUrl;
  if (datasourceUrl === undefined) {
    throw new Error(
      'No URL specified for AzureRegionalMetricsDatasource client. You can use directUrl in the spec to configure it.',
    );
  }

  const specHeaders = proxy?.spec.headers;

  return {
    options: {
      datasourceUrl,
    },
    metricsBatchQuery: async (metricsBatchOptions, headers) => {
      const {
        metricNames,
        metricNamespace,
        aggregation,
        endTime,
        filter,
        interval,
        orderBy,
        rollupBy,
        startTime,
        top,
      } = metricsBatchOptions.queryParameters;

      const params = new URLSearchParams({
        'api-version': AZURE_METRICS_BATCH_API_VERSION,
        metricnames: metricNames.join(','),
        metricnamespace: metricNamespace,
      });
      if (aggregation !== undefined) params.set('aggregation', aggregation.join(','));
      if (endTime !== undefined) params.set('endtime', endTime.toISOString());
      if (filter !== undefined) params.set('filter', filter);
      if (interval !== undefined) params.set('interval', interval);
      if (orderBy !== undefined) params.set('orderby', orderBy);
      if (rollupBy !== undefined) params.set('rollupby', rollupBy);
      if (startTime !== undefined) params.set('starttime', startTime.toISOString());
      if (top !== undefined) params.set('top', String(top));
      const url =
        `${datasourceUrl}/subscriptions/${encodeURIComponent(metricsBatchOptions.subscriptionId)}/metrics:getBatch?` +
        params;

      const maxRequests = maxRequestsPerQuery ?? AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT;
      const warning =
        maxRequests * AZURE_METRICS_BATCH_MAX_RESOURCE_IDS_PER_BATCH < metricsBatchOptions.resourceIds.length
          ? 'Query result truncated due to max requests per query limit.'
          : undefined;
      const resourceIdBatches = chunkArray(
        metricsBatchOptions.resourceIds,
        AZURE_METRICS_BATCH_MAX_RESOURCE_IDS_PER_BATCH,
        maxRequests,
      );

      const responses = await Promise.all(
        resourceIdBatches.map(async (resourceIds): Promise<AzureMetricsBatchApiSuccessResponseBody> => {
          const init = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(headers ?? specHeaders) },
            body: JSON.stringify(buildMetricsBatchRequestBody({ ...metricsBatchOptions, resourceIds })),
          };

          const response = await globalThis.fetch(url, init);
          if (!response.ok) {
            let errorMessage = `Azure metrics batch request failed with status ${response.status}`;
            try {
              const errorBody: AzureMetricsBatchApiErrorResponseBody = await response.json();
              errorMessage += `: ${errorBody.error.code} - ${errorBody.error.message}`;
            } catch {
              // Response body wasn't valid JSON matching the expected error shape; fall back to the generic message.
            }
            throw new UserFriendlyError(errorMessage, response.status);
          } else {
            const successBody: AzureMetricsBatchApiSuccessResponseBody = await response.json();
            return successBody;
          }
        }),
      );

      return {
        values: responses.flatMap((response) => response.values),
        warning: warning,
      };
    },
  };
};

export const AzureRegionalMetricsDatasource: DatasourcePlugin<
  AzureRegionalMetricsDatasourceSpec,
  AzureRegionalMetricsDatasourceClient
> = {
  createClient,
  OptionsEditorComponent: AzureRegionalMetricsDatasourceEditor,
  createInitialOptions: () => ({ directUrl: '' }),
};

function buildMetricsBatchRequestBody(
  metricsBatchOptions: AzureMetricsBatchQueryRequestOptions,
): AzureMetricsBatchApiRequestBody {
  return {
    resourceids: metricsBatchOptions.resourceIds,
  };
}

function chunkArray<T>(items: T[], chunkSize: number, maxChunks?: number): T[][] {
  const chunks: T[][] = [];
  const maxIndex = Math.min(items.length, (maxChunks ?? Infinity) * chunkSize);
  for (let i = 0; i < maxIndex; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
