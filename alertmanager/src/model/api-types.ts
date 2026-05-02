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

/**
 * Alert Manager v2 API response types.
 * Based on the Alertmanager OpenAPI v2 spec.
 * @see https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
 */

/**
 * A matcher used by silences and alerts.
 */
export interface Matcher {
  name: string;
  value: string;
  isRegex: boolean;
  isEqual: boolean;
}

/**
 * Alert status from the Alertmanager API.
 */
export interface AlertStatus {
  state: 'unprocessed' | 'active' | 'suppressed';
  silencedBy: string[];
  inhibitedBy: string[];
  mutedBy: string[];
}

/**
 * A gettable alert returned by the Alertmanager API.
 */
export interface GettableAlert {
  annotations: Record<string, string>;
  endsAt: string;
  fingerprint: string;
  receivers: Array<{ name: string }>;
  startsAt: string;
  status: AlertStatus;
  updatedAt: string;
  generatorURL?: string;
  labels: Record<string, string>;
}

/**
 * Silence status from the Alertmanager API.
 */
export interface SilenceStatus {
  state: 'expired' | 'active' | 'pending';
}

/**
 * A gettable silence returned by the Alertmanager API.
 */
export interface GettableSilence {
  id: string;
  status: SilenceStatus;
  updatedAt: string;
  comment: string;
  createdBy: string;
  endsAt: string;
  matchers: Matcher[];
  startsAt: string;
}

/**
 * A postable silence used for creating or updating silences.
 */
export interface PostableSilence {
  id?: string;
  comment: string;
  createdBy: string;
  endsAt: string;
  matchers: Matcher[];
  startsAt: string;
}

/**
 * Cluster status from the Alertmanager API.
 */
export interface ClusterStatus {
  name?: string;
  status: string;
  peers: Array<{
    name: string;
    address: string;
  }>;
}

/**
 * Version info from the Alertmanager API.
 */
export interface VersionInfo {
  branch: string;
  buildDate: string;
  buildUser: string;
  goVersion: string;
  revision: string;
  version: string;
}

/**
 * Alertmanager status response.
 */
export interface AlertManagerStatus {
  cluster: ClusterStatus;
  config: { original: string };
  uptime: string;
  versionInfo: VersionInfo;
}

/**
 * Parameters for querying alerts.
 */
export interface AlertsQueryParams {
  filter?: string[];
  silenced?: boolean;
  inhibited?: boolean;
  active?: boolean;
  unprocessed?: boolean;
  receiver?: string;
}

/**
 * Parameters for querying silences.
 */
export interface SilencesQueryParams {
  filter?: string[];
}
