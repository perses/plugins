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

import { AlertsQueryContext, datasourceSelectValueToSelector, replaceVariables } from '@perses-dev/plugin-system';
import { Alert, AlertState, AlertsData, SuppressionRule } from '@perses-dev/spec';
import { ALERTMANAGER_DATASOURCE_KIND, AlertManagerClient, DEFAULT_ALERTMANAGER, GettableAlert } from '../../model';
import { AlertManagerAlertsQuerySpec } from '../types';

/**
 * Map Alertmanager API alert state to the generic AlertState.
 *
 * AM `active`      → generic `firing`
 * AM `suppressed`  → generic `firing` (with `suppressed: true`)
 * AM `unprocessed` → generic `pending`
 */
function mapAlertState(amState: 'unprocessed' | 'active' | 'suppressed'): AlertState {
  switch (amState) {
    case 'active':
    case 'suppressed':
      return 'firing';
    case 'unprocessed':
      return 'pending';
  }
}

/**
 * Build SuppressionRule entries from the Alertmanager status fields.
 */
function buildSuppressionRules(status: GettableAlert['status']): SuppressionRule[] {
  const rules: SuppressionRule[] = [];
  for (const id of status.silencedBy) {
    rules.push({ type: 'silence', id });
  }
  for (const id of status.inhibitedBy) {
    rules.push({ type: 'inhibition', id });
  }
  for (const id of status.mutedBy) {
    rules.push({ type: 'mute', id });
  }
  return rules;
}

/**
 * Transform a GettableAlert from the Alertmanager API into our normalized Alert format.
 */
function transformAlert(apiAlert: GettableAlert): Alert {
  const isSuppressed = apiAlert.status.state === 'suppressed';
  const suppressionRules = buildSuppressionRules(apiAlert.status);

  const alert: Alert = {
    id: apiAlert.fingerprint,
    name: apiAlert.labels['alertname'] ?? '',
    state: mapAlertState(apiAlert.status.state),
    labels: apiAlert.labels,
    annotations: apiAlert.annotations,
    startsAt: apiAlert.startsAt,
    endsAt: apiAlert.endsAt,
    updatedAt: apiAlert.updatedAt,
    receivers: apiAlert.receivers.map((r) => r.name),
  };

  if (apiAlert.labels['severity']) {
    alert.severity = apiAlert.labels['severity'];
  }

  if (apiAlert.generatorURL) {
    alert.sourceURL = apiAlert.generatorURL;
  }

  if (isSuppressed) {
    alert.suppressed = true;
  }

  if (suppressionRules.length > 0) {
    alert.suppressedBy = suppressionRules;
  }

  return alert;
}

/**
 * Get alerts data from Alert Manager, transforming the API response into the plugin-system AlertsData format.
 */
export async function getAlertsData(
  spec: AlertManagerAlertsQuerySpec,
  context: AlertsQueryContext
): Promise<AlertsData> {
  const listDatasourceSelectItems =
    await context.datasourceStore.listDatasourceSelectItems(ALERTMANAGER_DATASOURCE_KIND);
  const datasourceSelector =
    datasourceSelectValueToSelector(spec.datasource, context.variableState, listDatasourceSelectItems) ??
    DEFAULT_ALERTMANAGER;
  const client = await context.datasourceStore.getDatasourceClient<AlertManagerClient>(datasourceSelector);

  const interpolatedFilters = spec.filters?.map((f) => replaceVariables(f, context.variableState));
  const interpolatedReceiver = spec.receiver ? replaceVariables(spec.receiver, context.variableState) : undefined;

  const apiAlerts = await client.getAlerts({
    filter: interpolatedFilters,
    active: spec.active,
    silenced: spec.silenced,
    inhibited: spec.inhibited,
    unprocessed: spec.unprocessed,
    receiver: interpolatedReceiver,
  });

  const alerts = apiAlerts.map(transformAlert);

  return {
    alerts,
    metadata: {
      executedQueryString: buildQueryString(spec),
    },
  };
}

function buildQueryString(spec: AlertManagerAlertsQuerySpec): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries({
        filters: spec.filters,
        active: spec.active,
        silenced: spec.silenced,
        inhibited: spec.inhibited,
        receiver: spec.receiver,
      }).filter(([, value]) => value !== undefined)
    )
  );
}
