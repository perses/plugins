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
export const queryExample = `-- Time Series Query (needs a "time" column)
SELECT
  date_trunc('minute', event_time) AS time,
  avg(cpu_usage) AS avg_cpu,
  max(memory_usage) AS max_memory
FROM system_metrics
WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
GROUP BY 1
ORDER BY 1
-- Logs Query (needs a "timestamp", "log_time", or "time" column)
SELECT
  event_time AS timestamp,
  severity,
  service_name,
  message
FROM application_logs
WHERE event_time >= TIMESTAMP '{start}'
ORDER BY event_time DESC
LIMIT 1000`;

/** traceQueryExample is the example shown in the trace query editor. */
export const traceQueryExample = `-- Trace search (many traces): one row per span, grouped by trace_id.
-- Needs trace_id, span_id and a start_time (or timestamp) column. The end comes from end_time or duration_ms.
WITH recent AS (
  SELECT trace_id
  FROM iceberg.otel.spans
  WHERE service_name IN (\${service:sqlstring})
    AND start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
  GROUP BY trace_id
  ORDER BY max(start_time) DESC
  LIMIT 100
)
SELECT
  lower(to_hex(s.trace_id)) AS trace_id,
  lower(to_hex(s.span_id)) AS span_id,
  lower(to_hex(s.parent_span_id)) AS parent_span_id,
  s.service_name,
  s.name AS span_name,
  s.start_time,
  s.end_time,
  s.status_code
FROM iceberg.otel.spans s
JOIN recent r ON s.trace_id = r.trace_id
WHERE s.start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
ORDER BY s.start_time DESC
-- Single trace (for a TracingGanttChart): a result with one trace_id returns only the full trace.
SELECT
  lower(to_hex(trace_id)) AS trace_id,
  lower(to_hex(span_id)) AS span_id,
  lower(to_hex(parent_span_id)) AS parent_span_id,
  service_name,
  name AS span_name,
  kind AS span_kind,
  start_time,
  to_milliseconds(end_time - start_time) AS duration_ms,
  status_code,
  attributes
FROM iceberg.otel.spans
WHERE trace_id = from_hex(\${trace_id:sqlstring})
ORDER BY start_time`;

/** jsonQueryExample is the example shown in the JSON query editor. */
export const jsonQueryExample = `-- Table rows: every row becomes an object keyed by column name. No time column is needed.
-- {start} and {end} are not replaced because a JSON query has no dashboard time range.
SELECT
  service_name,
  count(*) AS spans,
  count_if(status_code = 'ERROR') AS errors,
  round(100e0 * count_if(status_code = 'ERROR') / count(*), 2) AS error_pct
FROM iceberg.otel.spans
WHERE start_time > current_timestamp - INTERVAL '1' HOUR
GROUP BY service_name
ORDER BY errors DESC, spans DESC
LIMIT 10`;

/** variableQueryExample is the example shown in the SQL variable editor. */
export const variableQueryExample = `-- Variable values: the first column is the value, an optional second column is the display label.
SELECT DISTINCT region FROM iceberg.ops.hosts WHERE region IS NOT NULL ORDER BY region
-- Value and label
SELECT host_id AS value, concat(hostname, ' (', coalesce(region, 'unknown'), ')') AS label
FROM iceberg.ops.hosts
ORDER BY label
-- Depends on another variable and the time range
SELECT DISTINCT service_name
FROM iceberg.otel.spans
WHERE start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
  AND element_at(attributes, 'deployment.environment') = \${env:sqlstring}
ORDER BY service_name`;
