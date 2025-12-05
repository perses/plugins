import { pluginReact } from '@rsbuild/plugin-react';
import { createConfigForPlugin } from '../rsbuild.shared';

export default createConfigForPlugin({
  name: 'LogExplorer',
  rsbuildConfig: {
    server: { port: 3009 },
    plugins: [pluginReact()],
  },
  moduleFederation: {
    exposes: {
      './LogExplorer': './src/explore/log-explorer',
    },
    shared: {
      react: { requiredVersion: '18.2.0', singleton: true },
      'react-dom': { requiredVersion: '18.2.0', singleton: true },
      echarts: { singleton: true },
      'date-fns': { singleton: true },
      'date-fns-tz': { singleton: true },
      lodash: { singleton: true },
      '@perses-dev/components': { singleton: true },
      '@perses-dev/plugin-system': { singleton: true },
      '@perses-dev/explore': { singleton: true },
      '@perses-dev/dashboards': { singleton: true },
      '@emotion/react': { requiredVersion: '^11.11.3', singleton: true },
      '@emotion/styled': { singleton: true },
      '@hookform/resolvers': { singleton: true },
      '@tanstack/react-query': { singleton: true },
      'react-hook-form': { singleton: true },
      'react-router-dom': { singleton: true },
    },
  },
});
