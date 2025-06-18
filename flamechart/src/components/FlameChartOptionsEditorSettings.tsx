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

import { ReactElement } from 'react';
import { OptionsEditorGroup, OptionsEditorGrid, OptionsEditorColumn } from '@perses-dev/components';
import { Button } from '@mui/material';
import { FlameChartOptionsEditorProps } from '../flame-chart-model';
import {
  usePaletteState,
  useShowSettingsState,
  useShowSeriesState,
  useShowTableState,
  useShowFlameGraphState,
  resetSettings,
} from '../utils/utils';
import { PaletteSelector } from './PaletteSelector';
import { SwitchSelector } from './SwitchSelector';

export function FlameChartOptionsEditorSettings(props: FlameChartOptionsEditorProps): ReactElement {
  const { value } = props;

  const { handlePaletteChange } = usePaletteState(props);
  const { handleShowSettingsChange } = useShowSettingsState(props);
  const { handleShowSeriesChange } = useShowSeriesState(props);
  const { handleShowTableChange } = useShowTableState(props);
  const { handleShowFlameGraphChange } = useShowFlameGraphState(props);

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Misc">
          <PaletteSelector value={value.palette} onChange={handlePaletteChange} />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Panels to display">
          <SwitchSelector label="Show Options" value={value.showSettings} onChange={handleShowSettingsChange} />
          <SwitchSelector label="Show Series" value={value.showSeries} onChange={handleShowSeriesChange} />
          <SwitchSelector label="Show Table" value={value.showTable} onChange={handleShowTableChange} />
          <SwitchSelector label="Show Flame Graph" value={value.showFlameGraph} onChange={handleShowFlameGraphChange} />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Reset Settings">
          <Button variant="outlined" color="secondary" onClick={() => resetSettings(props)}>
            Reset To Defaults
          </Button>
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
