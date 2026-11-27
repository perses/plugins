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

import type { AlertsQueryPlugin, VariableStateMap } from '@perses-dev/plugin-system';
import { parseVariables, replaceVariables } from '@perses-dev/plugin-system';
import type { Notice } from '@perses-dev/spec';

import type { ClickStackDatasourceClient } from '../../datasources/click-stack-datasource/click-stack-datasource-types';
import type { ClickStackAlertsParams } from '../../model/click-stack-client';
import { ALERTS_PATH, buildAlertsSearchParams } from '../../model/click-stack-client';
import { CLICKSTACK_DATASOURCE_KIND, DEFAULT_CLICKSTACK } from '../../model/click-stack-selectors';
import { getDatasourceClient } from '../../model/datasource-client';
import { buildAlerts } from './alerts';
import type { ClickStackAlertsQuerySpec } from './click-stack-alerts-query-types';
import { DEFAULT_ALERT_STATES } from './click-stack-alerts-query-types';

// Replaces the variables of a tag. A variable with several values gives as many tags, one per value.
function expandTag(tag: string, variableState: VariableStateMap): string[] {
  const multiple = parseVariables(tag).find((name) => Array.isArray(variableState[name]?.value));
  const state = multiple === undefined ? undefined : variableState[multiple];
  if (multiple === undefined || state === undefined || !Array.isArray(state.value)) {
    return [replaceVariables(tag, variableState)];
  }
  return state.value.flatMap((value) => expandTag(tag, { ...variableState, [multiple]: { ...state, value } }));
}

/** buildAlertsParams returns the filters of the alerts request of a query, with its variables replaced. */
export function buildAlertsParams(
  spec: ClickStackAlertsQuerySpec,
  variableState: VariableStateMap,
): ClickStackAlertsParams {
  const tags = new Set<string>();
  for (const tag of spec.tags ?? []) {
    for (const expanded of expandTag(tag, variableState)) {
      if (expanded.trim() !== '') tags.add(expanded.trim());
    }
  }
  const search = spec.search ? replaceVariables(spec.search, variableState).trim() : '';
  return {
    states: spec.states && spec.states.length > 0 ? spec.states : DEFAULT_ALERT_STATES,
    ...(spec.sources && spec.sources.length > 0 && { sources: spec.sources }),
    ...(tags.size > 0 && { tags: [...tags] }),
    ...(search !== '' && { search }),
  };
}

export const getAlertsData: AlertsQueryPlugin<ClickStackAlertsQuerySpec>['getAlertsData'] = async (
  spec,
  context,
  abortSignal,
) => {
  const client = await getDatasourceClient<ClickStackDatasourceClient>(
    spec.datasource,
    CLICKSTACK_DATASOURCE_KIND,
    DEFAULT_CLICKSTACK,
    context,
  );
  const params = buildAlertsParams(spec, context.variableState);
  const { alerts, total } = await client.getAlerts({ ...params, signal: abortSignal });

  const notices: Notice[] =
    total > alerts.length
      ? [{ type: 'warning', message: `Only the first ${alerts.length} of the ${total} alerts are shown.` }]
      : [];
  return {
    alerts: buildAlerts(alerts, { uiUrl: client.options.uiUrl, now: Date.now() }),
    metadata: {
      executedQueryString: `GET ${ALERTS_PATH}?${buildAlertsSearchParams(params).toString()}`,
      ...(notices.length > 0 && { notices }),
    },
  };
};
