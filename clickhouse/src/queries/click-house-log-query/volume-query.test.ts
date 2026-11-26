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

import { buildVolumeQuery } from './volume-query';

describe('buildVolumeQuery', () => {
  it('counts all the logs of the query over time, split by level', () => {
    expect(
      buildVolumeQuery(
        'SELECT log_time, message, Severity FROM app.logs WHERE $__timeFilter(log_time) ORDER BY log_time DESC LIMIT 500',
      ),
    ).toBe(
      [
        "SELECT $__timeInterval(`log_time`) AS time, if(lower(ifNull(toString(`Severity`), '')) = '', 'unknown', lower(ifNull(toString(`Severity`), ''))) AS level, count() AS logs",
        'FROM (\nSELECT log_time, message, Severity FROM app.logs WHERE $__timeFilter(log_time)\n)',
        'GROUP BY time, level',
        'ORDER BY time',
      ].join('\n'),
    );
  });

  it('assumes the columns of the OpenTelemetry logs table behind a wildcard', () => {
    expect(buildVolumeQuery('SELECT * FROM otel_logs LIMIT 10')).toContain(
      "$__timeInterval(`Timestamp`) AS time, if(lower(ifNull(toString(`SeverityText`), ''))",
    );
    // Unless the wildcard leaves them out.
    expect(buildVolumeQuery('SELECT * EXCEPT (SeverityText, ResourceAttributes) FROM otel_logs LIMIT 10')).toBe(
      [
        'SELECT $__timeInterval(`Timestamp`) AS time, count() AS logs',
        'FROM (\nSELECT * EXCEPT (SeverityText, ResourceAttributes) FROM otel_logs\n)',
        'GROUP BY time',
        'ORDER BY time',
      ].join('\n'),
    );
    expect(buildVolumeQuery('SELECT * EXCEPT Timestamp FROM otel_logs')).toBeUndefined();
  });

  it('gives up when the time column of the logs is unknown or the query can not be cut', () => {
    expect(buildVolumeQuery('SELECT message FROM logs')).toBeUndefined();
    expect(buildVolumeQuery('SELECT Timestamp FROM a UNION ALL SELECT Timestamp FROM b')).toBeUndefined();
  });
});
