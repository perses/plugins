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

import { Stack } from '@mui/material';
import type { OptionsEditorProps } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';

import { ClickHouseDatasourceSelect, QueryExamples, SQLField } from '../../components';
import { PROFILE_EXAMPLES } from '../../components/query-examples';
import type { ClickHouseProfileQuerySpec } from './click-house-profile-query-types';

type ClickHouseProfileQueryEditorProps = OptionsEditorProps<ClickHouseProfileQuerySpec>;

export function ClickHouseProfileQueryEditor(props: ClickHouseProfileQueryEditorProps): ReactElement {
  const { onChange, value, isReadonly } = props;

  return (
    <Stack spacing={1.5}>
      <ClickHouseDatasourceSelect
        value={value.datasource}
        onChange={(datasource) => onChange({ ...value, datasource })}
        isReadonly={isReadonly}
      />
      <SQLField
        label="ClickHouse Query"
        value={value.query}
        onChange={(query) => onChange({ ...value, query })}
        placeholder="Enter a ClickHouse SQL query returning the samples of the profile"
        isReadonly={isReadonly}
      />
      <QueryExamples examples={PROFILE_EXAMPLES} />
    </Stack>
  );
}
