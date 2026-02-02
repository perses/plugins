import { pluginReact } from '@rsbuild/plugin-react';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
export default {
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [
        new ModuleFederationPlugin({
          name: 'influxdb',
          filename: 'remoteEntry.js',
          exposes: {
            './plugin': './src/getPluginModule.ts',
          },
          shared: {
            react: { singleton: true, requiredVersion: false },
            'react-dom': { singleton: true, requiredVersion: false },
            '@perses-dev/core': { singleton: true, requiredVersion: false },
            '@perses-dev/plugin-system': { singleton: true, requiredVersion: false },
            '@perses-dev/components': { singleton: true, requiredVersion: false },
          },
        }),
      ],
    },
  },
};
