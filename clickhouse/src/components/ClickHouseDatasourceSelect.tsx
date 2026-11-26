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

import type { DatasourceSelectProps } from '@perses-dev/plugin-system';
import { DatasourceSelect } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';

import type { ClickHouseDatasourceSelectValue } from '../model/click-house-selectors';
import {
  CLICKHOUSE_DATASOURCE_KIND,
  DEFAULT_CLICKHOUSE,
  isClickHouseDatasourceSelectValue,
} from '../model/click-house-selectors';

export interface ClickHouseDatasourceSelectProps {
  value: ClickHouseDatasourceSelectValue | undefined;
  onChange: (next: ClickHouseDatasourceSelectValue) => void;
  isReadonly?: boolean;
}

/** ClickHouseDatasourceSelect selects the ClickHouse datasource of a query, or a variable holding its name. */
export function ClickHouseDatasourceSelect(props: ClickHouseDatasourceSelectProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const handleChange: DatasourceSelectProps['onChange'] = (next) => {
    if (!isClickHouseDatasourceSelectValue(next)) {
      throw new Error('Got unexpected non ClickHouse datasource selection');
    }
    onChange(next);
  };

  return (
    <DatasourceSelect
      datasourcePluginKind={CLICKHOUSE_DATASOURCE_KIND}
      value={value ?? DEFAULT_CLICKHOUSE}
      onChange={handleChange}
      readOnly={isReadonly}
      label="ClickHouse Datasource"
      notched
    />
  );
}
