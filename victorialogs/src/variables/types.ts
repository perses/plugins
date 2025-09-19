import { VictoriaLogsDatasourceSelector } from "../model";

export interface VictoriaLogsVariableOptionsBase {
  datasource?: VictoriaLogsDatasourceSelector;
}

export type VictoriaLogsFieldNamesVariableOptions = VictoriaLogsVariableOptionsBase & {
  query: string;
};

export type VictoriaLogsFieldValuesVariableOptions = VictoriaLogsVariableOptionsBase & {
  field: string;
  query: string;
};
