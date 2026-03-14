import { pluginReact } from '@rsbuild/plugin-react';
import { createConfigForPlugin } from '../rsbuild.shared';

export default createConfigForPlugin({
  name: 'InfluxDB',
  rsbuildConfig: {
    plugins: [pluginReact()],
  },
  moduleFederation: {
    exposes: {
      './InfluxDBDatasource': './src/datasource/influxdb/InfluxDBDatasource.ts',
      './InfluxDBTimeSeriesQuery': './src/queries/influxdb-time-series-query/InfluxDBTimeSeriesQuery.ts',
      './InfluxDBExplorer': './src/explore/InfluxDBExplorer.tsx',
    },
    shared: {
      react: { singleton: true, requiredVersion: false },
      'react-dom': { singleton: true, requiredVersion: false },
      'date-fns': { singleton: true },
      '@perses-dev/core': { singleton: true, requiredVersion: false },
      '@perses-dev/plugin-system': { singleton: true, requiredVersion: false },
      '@perses-dev/components': { singleton: true, requiredVersion: false },
      '@perses-dev/explore': { singleton: true },
      '@perses-dev/dashboards': { singleton: true },
      '@hookform/resolvers': { singleton: true },
      '@tanstack/react-query': { singleton: true },
      'react-hook-form': { singleton: true },
      'react-router-dom': { singleton: true },
    },
  },
});
