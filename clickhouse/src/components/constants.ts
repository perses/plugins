// Copyright 2025 The Perses Authors
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
  toStartOfMinute(timestamp) as time,
  avg(cpu_usage) as avg_cpu,
  max(memory_usage) as max_memory
FROM system_metrics 
WHERE timestamp BETWEEN '{start}' AND '{end}'
GROUP BY time ORDER BY time
-- Logs Query  
SELECT 
  Timestamp as log_time,
  Body,
  ServiceName,
  ResourceAttributes,
  SeverityNumber,
  SeverityText
FROM application_logs 
WHERE timestamp >= '{start}' 
ORDER BY time DESC LIMIT 1000`;
