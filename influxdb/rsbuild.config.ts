import { pluginReact } from '@rsbuild/plugin-react';
import { createConfigForPlugin } from '../rsbuild.shared';

export default createConfigForPlugin({
  name: 'InfluxDB',
  rsbuildConfig: {
    plugins: [pluginReact()],
  },
  moduleFederation: {
    exposes: {
      './InfluxDBDatasource': './src/datasources/influxdb-v1/InfluxDBV1Datasource.ts',
      './InfluxDBTimeSeriesQuery': './src/queries/influxdb-time-series-query/InfluxDBTimeSeriesQuery.ts',
    },
    shared: {
      react: { singleton: true, requiredVersion: false },
      'react-dom': { singleton: true, requiredVersion: false },
      '@perses-dev/core': { singleton: true, requiredVersion: false },
      '@perses-dev/plugin-system': { singleton: true, requiredVersion: false },
      '@perses-dev/components': { singleton: true, requiredVersion: false },
    },
  },
});
