// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { parseDimensions } from '../../components/DimensionsEditor';
import {
  getCloudWatchEndpoint,
  getRegionFromEndpoint,
  newCloudWatchDatasourceSpec,
  validateCloudWatchDatasourceSpec,
} from './cloudwatch-datasource-types';
import { CloudWatchDatasource } from './CloudWatchDatasource';

describe('CloudWatchDatasource', () => {
  it('creates a client for the server proxy only', () => {
    const spec = CloudWatchDatasource.createInitialOptions();
    expect(
      CloudWatchDatasource.createClient(spec, { proxyUrl: '/proxy/globaldatasources/cw' }).options.datasourceUrl,
    ).toBe('/proxy/globaldatasources/cw');
    expect(() => CloudWatchDatasource.createClient(spec, {})).toThrow('Perses server proxy');
  });

  it('creates an HTTP proxy to the CloudWatch API, restricted to its single endpoint', () => {
    expect(CloudWatchDatasource.createInitialOptions()).toEqual({
      proxy: {
        kind: 'HTTPProxy',
        spec: {
          url: 'https://monitoring.us-east-1.amazonaws.com',
          allowedEndpoints: [{ endpointPattern: '^/$', method: 'POST' }],
        },
      },
    });
  });
});

describe('CloudWatch endpoints', () => {
  it.each([
    ['us-east-1', 'https://monitoring.us-east-1.amazonaws.com'],
    ['eu-west-3', 'https://monitoring.eu-west-3.amazonaws.com'],
    ['cn-north-1', 'https://monitoring.cn-north-1.amazonaws.com.cn'],
  ])('maps %s to %s and back', (region, url) => {
    expect(getCloudWatchEndpoint(region)).toBe(url);
    expect(getRegionFromEndpoint(url)).toBe(region);
  });

  it('does not guess the region of another URL', () => {
    expect(getRegionFromEndpoint('https://vpce-123.monitoring.us-east-1.vpce.amazonaws.com')).toBeUndefined();
  });
});

describe('validateCloudWatchDatasourceSpec', () => {
  it('requires a secret and HTTPS', () => {
    expect(validateCloudWatchDatasourceSpec(newCloudWatchDatasourceSpec('us-east-1', 'aws-sigv4'))).toEqual({});
    expect(validateCloudWatchDatasourceSpec(newCloudWatchDatasourceSpec('us-east-1'))).toEqual({
      secret: expect.any(String),
    });
    expect(
      validateCloudWatchDatasourceSpec({
        proxy: { kind: 'HTTPProxy', spec: { url: 'http://localhost:4566', secret: 's' } },
      }),
    ).toEqual({ url: expect.any(String) });
  });
});

describe('parseDimensions', () => {
  it('parses an object of string values', () => {
    expect(parseDimensions('{"InstanceId": "$instance"}')).toEqual({ InstanceId: '$instance' });
    expect(parseDimensions('  ')).toEqual({});
  });

  it.each(['not json', '[]', '{"InstanceId": 1}', '{"InstanceId": ""}'])('rejects %s', (text) => {
    expect(parseDimensions(text)).toBeUndefined();
  });
});
