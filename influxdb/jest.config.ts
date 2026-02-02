import type { Config } from 'jest';
import sharedConfig from '../jest.shared';
const config: Config = {
  ...sharedConfig,
  displayName: 'influxdb',
};
export default config;
