import { LogsComponent } from './LogsComponent';
import { LogsOptions, LogsProps } from './logs-types';
import { PanelPlugin } from '@perses-dev/plugin-system';
import { LogsSettingsEditor } from './LogsSettingsEditor';

export const Logs: PanelPlugin<LogsOptions, LogsProps> = {
  PanelComponent: LogsComponent,
  panelOptionsEditorComponents: [{ label: 'Settings', content: LogsSettingsEditor }],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
