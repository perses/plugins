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

import type { TrinoClient } from '../../model/trino-client';
import { TRUNCATED_NOTICE } from '../../model/trino-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { interpolateQueryContext } from '../query-context';
import type { TrinoJsonQuerySpec } from './trino-json-query-types';

/** getTrinoJsonData returns each result row as an object. A JSON query has no time range, so {start} and {end} stay. */
export const getTrinoJsonData: JsonQueryPlugin<TrinoJsonQuerySpec>['getJsonData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (spec.query === undefined || spec.query === null || spec.query.trim() === '') {
    return { data: [] };
  }

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE,
  )) as TrinoClient;

  const executedQueryString = replaceVariables(spec.query, context.variableState);
  const response = await client.query({
    query: executedQueryString,
    ...interpolateQueryContext(spec, context.variableState),
    signal: abortSignal,
  });

  return {
    data: response.data ?? [],
    metadata: {
      executedQueryString,
      ...(response.truncated && { notices: [TRUNCATED_NOTICE] }),
    },
  };
};
