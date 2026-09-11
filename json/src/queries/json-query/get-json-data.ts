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

import type { JsonQueryPlugin } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import jsonata from 'jsonata';

import type { JsonDatasourceClient } from '../../datasources/json-datasource/json-datasource-types';
import { DEFAULT_DATASOURCE } from './constants';
import type { JsonQuerySpec } from './json-query-types';

async function applyJsonata(data: unknown, expression: string): Promise<unknown> {
  const expr = jsonata(expression);
  return expr.evaluate(data);
}

export const getJsonData: JsonQueryPlugin<JsonQuerySpec>['getJsonData'] = async (spec, context) => {
  const endpointUrl = replaceVariables(spec.endpointUrl, context.variableState);

  const queryParams = spec.queryParams
    ? Object.fromEntries(
        Object.entries(spec.queryParams).map(([k, v]) => [k, replaceVariables(v, context.variableState)]),
      )
    : undefined;

  const client = await context.datasourceStore.getDatasourceClient<JsonDatasourceClient>(
    spec.datasource ?? DEFAULT_DATASOURCE,
  );

  let response = await client.query({
    endpointUrl,
    method: spec.method ?? 'GET',
    queryParams,
    body: spec.body ? replaceVariables(spec.body, context.variableState) : undefined,
  });

  if (spec.jsonataExpression) {
    response = await applyJsonata(response, spec.jsonataExpression);
    if (response === undefined) {
      throw new Error(`JSONata expression did not match any data. Please check the expression and the input data.`);
    }
  }

  return { data: response };
};
