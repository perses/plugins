// Copyright 2025 The Perses Authors
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

import {
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
} from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { ReactElement } from 'react';
import { Switch } from '@mui/material';
import { LogsOptions } from './logs-types';

type LogsSettingsEditorProps = OptionsEditorProps<LogsOptions>;

export function LogsSettingsEditor(props: LogsSettingsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleEnableDetails = (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, enableDetails: e.target.checked });

  const handleEnableTime = (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, time: e.target.checked });

  const handleEnableWrap = (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, wrap: e.target.checked });

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Display">
          <OptionsEditorControl
            label="Log details"
            control={<Switch checked={!!value.enableDetails} onChange={handleEnableDetails} />}
          />
          <OptionsEditorControl label="Time" control={<Switch checked={!!value.time} onChange={handleEnableTime} />} />
          <OptionsEditorControl
            label="Wrap lines"
            control={<Switch checked={!!value.wrap} onChange={handleEnableWrap} />}
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
