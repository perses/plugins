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

import { LogsQueryData } from '../model';

export const MOCK_LOGS_QUERY_RESULT: LogsQueryData = {
  logs: {
    hasMore: false,
    timeRange: {
      start: new Date(1666625490),
      end: new Date(1666625535),
    },
    entries: [
      {
        timestamp: 1666625491,
        line: 'foo',
        labels: {
          device: '/dev/vda1',
          env: 'demo',
          fstype: 'ext4',
          instance: 'demo.do.prometheus.io:9100',
          job: 'node',
          mountpoint: '/',
        },
      },
      {
        timestamp: 1666625490,
        line: 'bar',
        labels: {
          device: '/dev/vda15',
          env: 'demo',
          fstype: 'vfat',
          instance: 'demo.do.prometheus.io:9100',
          job: 'node',
          mountpoint: '/boot/efi',
        },
      },
    ],
  },
};

export const MOCK_LOGS_QUERY_RESULTS: LogsQueryData[] = [
  {
    logs: {
      entries: [
        {
          timestamp: 1769009811.4465687,
          line: '{"host":"120.180.160.121", "user-identifier":"-", "datetime":"21/Jan/2026:15:32:31 +0000", "method": "DELETE", "request": "/killer/pixy", "protocol":"HTTP/2.0", "status":200, "bytes":9821, "referer": "http://www.internationalend-to-end.com/e-business/web services"}',
          labels: {
            app: 'log-generator',
            bytes: '9821',
            datetime: '21/Jan/2026:15:32:31 +0000',
            detected_level: 'unknown',
            filename: '/var/log/fake/fake.log',
            host: '120.180.160.121',
            method: 'DELETE',
            protocol: 'HTTP/2.0',
            referer: 'http://www.internationalend-to-end.com/e-business/web services',
            request: '/killer/pixy',
            service_name: 'log-generator',
            status: '200',
            user_identifier: '-',
          },
        },
      ],
      totalCount: 1,
    },
  },
  {
    logs: {
      entries: [
        {
          timestamp: 1769009890.5294495,
          line: '{"host":"18.178.231.77", "user-identifier":"cormier2584", "datetime":"21/Jan/2026:15:33:49 +0000", "method": "POST", "request": "/facilitate/mesh/methodologies/deploy", "protocol":"HTTP/1.1", "status":503, "bytes":9892, "referer": "http://www.direct.com/holistic"}',
          labels: {
            app: 'log-generator',
            bytes: '9892',
            datetime: '21/Jan/2026:15:33:49 +0000',
            detected_level: 'unknown',
            filename: '/var/log/fake/fake.log',
            host: '18.178.231.77',
            method: 'POST',
            protocol: 'HTTP/1.1',
            referer: 'http://www.direct.com/holistic',
            request: '/facilitate/mesh/methodologies/deploy',
            service_name: 'log-generator',
            status: '503',
            user_identifier: 'cormier2584',
          },
        },
      ],
      totalCount: 1,
    },
  },
];

export const MOCK_LOGS_QUERY_DEFINITION = {
  kind: 'LogsQuery',
  spec: {
    plugin: {
      kind: 'LokiLogsQuery',
      spec: {
        query: '',
      },
    },
  },
};
