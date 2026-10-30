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

import type { HTTPProxy } from '@perses-dev/spec';

// The datasource is queried through the HTTP proxy of the Perses server, which signs the requests with the SigV4
// credentials of the secret. The browser never receives AWS credentials.
export interface CloudWatchDatasourceSpec {
  proxy: HTTPProxy;
}

// The CloudWatch API is a single endpoint: every operation is a POST on the root path.
export const CLOUDWATCH_ALLOWED_ENDPOINTS = [{ endpointPattern: '^/$', method: 'POST' }];

const REGION_REGEXP = /^[a-z]{2}(-[a-z]+)+-[0-9]{1,2}$/;
const ENDPOINT_REGEXP = /^https:\/\/monitoring\.([a-z]{2}(?:-[a-z]+)+-[0-9]{1,2})\.amazonaws\.com(?:\.cn)?\/?$/;

/**
 * Returns the URL of the CloudWatch API of a region.
 */
export function getCloudWatchEndpoint(region: string): string {
  const suffix = region.startsWith('cn-') ? 'amazonaws.com.cn' : 'amazonaws.com';
  return `https://monitoring.${region}.${suffix}`;
}

/**
 * Returns the region of a standard CloudWatch API URL, or undefined for another URL (for example a VPC endpoint).
 */
export function getRegionFromEndpoint(url: string): string | undefined {
  return ENDPOINT_REGEXP.exec(url)?.[1];
}

export function isValidRegion(region: string): boolean {
  return REGION_REGEXP.test(region);
}

export function newCloudWatchDatasourceSpec(region: string, secret?: string): CloudWatchDatasourceSpec {
  return {
    proxy: {
      kind: 'HTTPProxy',
      spec: { url: getCloudWatchEndpoint(region), allowedEndpoints: CLOUDWATCH_ALLOWED_ENDPOINTS, secret },
    },
  };
}

export interface CloudWatchDatasourceErrors {
  url?: string;
  secret?: string;
}

export function validateCloudWatchDatasourceSpec(spec: CloudWatchDatasourceSpec): CloudWatchDatasourceErrors {
  const errors: CloudWatchDatasourceErrors = {};
  if (!spec.proxy.spec.url.startsWith('https://')) {
    errors.url = 'The CloudWatch API must be reached with HTTPS.';
  }
  if (!spec.proxy.spec.secret) {
    errors.secret = 'A secret with SigV4 credentials is required to sign the requests.';
  }
  return errors;
}
