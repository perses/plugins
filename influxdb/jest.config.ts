const path = require('path');
const fs = require('fs');

// Read and parse the shared jest config inline to avoid module resolution issues
const swcrcPath = path.join(__dirname, '..', '.cjs.swcrc');
const swcrc = JSON.parse(fs.readFileSync(swcrcPath, 'utf-8'));

module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^echarts/(.*)$': 'echarts',
    '^use-resize-observer$': 'use-resize-observer/polyfilled',
    '\\.(css|less)$': '<rootDir>/../stylesMock.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(lodash-es|yaml))'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['@swc/jest', { ...swcrc, exclude: [], swcrc: false }],
  },
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.ts'],
};

