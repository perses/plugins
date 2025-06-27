import { LogsTablePanelComponent } from "./LogsTablePanelComponent";
import { LogsTablePanelOptions, LogsTablePanelProps } from "./logs-table-panel-types";
import { PanelPlugin } from "@perses-dev/plugin-system";
import { LogsTablePanelSettingsEditor } from "./LogsTablePanelSettingsEditor";

export const LogsTablePanel: PanelPlugin<LogsTablePanelOptions, LogsTablePanelProps> = {
  PanelComponent: LogsTablePanelComponent,
  panelOptionsEditorComponents: [{ label: 'Settings', content: LogsTablePanelSettingsEditor }],
  supportedQueryTypes: ['TimeSeriesQuery'],
  createInitialOptions: () => ({}),
};
