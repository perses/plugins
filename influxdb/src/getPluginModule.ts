import { PluginModuleResource, DatasourcePluginModule, TimeSeriesQueryPluginModule } from '@perses-dev/plugin-system';
import { InfluxDBV1Datasource } from './datasources/influxdb-v1';
import { InfluxDBV3Datasource } from './datasources/influxdb-v3';
import { InfluxDBTimeSeriesQuery } from './queries/influxdb-time-series-query';
export function getPluginModules(): PluginModuleResource[] {
  return [
    { kind: 'Datasource', plugin: InfluxDBV1Datasource, pluginKind: 'InfluxDBV1Datasource' } as DatasourcePluginModule,
    { kind: 'Datasource', plugin: InfluxDBV3Datasource, pluginKind: 'InfluxDBV3Datasource' } as DatasourcePluginModule,
    { kind: 'TimeSeriesQuery', plugin: InfluxDBTimeSeriesQuery, pluginKind: 'InfluxDBTimeSeriesQuery' } as TimeSeriesQueryPluginModule,
  ];
}
