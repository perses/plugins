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

export const queryExample = `-- Time Series Query
SELECT
  date_bin(INTERVAL '1 minute', ts) as ts,
  avg(cpu_usage) as avg_cpu,
  max(memory_usage) as max_memory
FROM system_metrics
WHERE ts BETWEEN to_timestamp_millis($__from) AND to_timestamp_millis($__to)
GROUP BY ts
ORDER BY ts

-- Logs Query
SELECT
  ts,
  service,
  level,
  message
FROM application_logs
WHERE ts BETWEEN to_timestamp_millis($__from) AND to_timestamp_millis($__to)
ORDER BY ts DESC
LIMIT 1000`;
