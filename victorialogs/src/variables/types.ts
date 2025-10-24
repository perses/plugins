import { DatasourceSelectValue } from '@perses-dev/plugin-system';
import { VictoriaLogsDatasourceSelector } from "../model";

export interface VictoriaLogsVariableOptionsBase {
  datasource?: DatasourceSelectValue<VictoriaLogsDatasourceSelector>;
}

export type VictoriaLogsFieldNamesVariableOptions = VictoriaLogsVariableOptionsBase & {
  query: string;
};

export type VictoriaLogsFieldValuesVariableOptions = VictoriaLogsVariableOptionsBase & {
  field: string;
  query: string;
};
