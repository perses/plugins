import { pluginReact } from '@rsbuild/plugin-react';
import { createConfigForPlugin } from '../rsbuild.shared';

export default createConfigForPlugin({
  name: 'SQL',
  rsbuildConfig: {
    server: { port: 3122 },
    plugins: [pluginReact()],
  },
  moduleFederation: {
    exposes: {
      './SQLDatasource': './src/datasources/sql-datasource/SQLDatasource.tsx',
      './SQLTimeSeriesQuery': './src/queries/sql-time-series-query/SQLTimeSeriesQuery.tsx',
      './SQLExplorer': './src/explore/SQLExplorer.tsx',
    },
    shared: {
      react: { requiredVersion: '18.2.0', singleton: true },
      'react-dom': { requiredVersion: '18.2.0', singleton: true },
      echarts: { requiredVersion: '^5.5.0', singleton: true },
      'date-fns': { requiredVersion: '^4.1.0', singleton: true },
      'date-fns-tz': { requiredVersion: '^3.2.0', singleton: true },
      lodash: { requiredVersion: '^4.17.21', singleton: true },
      '@perses-dev/components': { requiredVersion: '^0.54.0-beta.3', singleton: true },
      '@perses-dev/plugin-system': { requiredVersion: '^0.54.0-beta.3', singleton: true },
      '@perses-dev/explore': { requiredVersion: '^0.54.0-beta.3', singleton: true },
      '@perses-dev/dashboards': { requiredVersion: '^0.54.0-beta.3', singleton: true },
      '@emotion/react': { requiredVersion: '^11.11.3', singleton: true },
      '@emotion/styled': { requiredVersion: '^11.6.0', singleton: true },
      '@hookform/resolvers': { requiredVersion: '^3.2.0', singleton: true },
      '@tanstack/react-query': { requiredVersion: '^4.39.1', singleton: true },
      'react-hook-form': { requiredVersion: '^7.52.2', singleton: true },
      'react-router-dom': { requiredVersion: '^6.0.0', singleton: true },
      'use-resize-observer': { requiredVersion: '^9.0.0', singleton: true },
    },
  },
});
