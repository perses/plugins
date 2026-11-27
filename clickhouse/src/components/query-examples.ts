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

const MACROS = `-- Macros (the time range and the interval come from the dashboard):
--   $__timeFilter(column)       column >= <start> AND column <= <end>, with second precision
--   $__timeFilter_ms(column)    same, with millisecond precision
--   $__timeInterval(column)     toStartOfInterval(toDateTime(column), INTERVAL <interval> second)
--   $__interval_s               interval between two points, in seconds
--   $__fromTime, $__toTime      start and end of the time range, as DateTime
--   $__conditionalAll(condition, $variable)   the condition, or 1=1 when "All" is selected
-- Variables: \${variable:sqlstring} quotes the values, e.g. ServiceName IN (\${service:sqlstring})`;

export const TIME_SERIES_EXAMPLES = `-- A query returns a "time" column, numeric columns for the values,
-- and optional other columns: the rows are then split in one series per value of these columns.

-- Requests per service, from the OpenTelemetry traces
SELECT
  $__timeInterval(Timestamp) AS time,
  ServiceName,
  count() / $__interval_s AS rps
FROM otel_traces
WHERE $__timeFilter(Timestamp) AND SpanKind = 'Server'
GROUP BY time, ServiceName
ORDER BY time

-- An OpenTelemetry gauge, split by one of its attributes
SELECT
  $__timeInterval(TimeUnix) AS time,
  Attributes['state'] AS state,
  avg(Value) AS value
FROM otel_metrics_gauge
WHERE $__timeFilter(TimeUnix) AND MetricName = 'system.memory.utilization'
GROUP BY time, state
ORDER BY time

-- Exemplar query: a "time" and a "value" column, the label columns of the series (here ServiceName),
-- and the labels of the exemplar
SELECT Timestamp AS time, Duration / 1e6 AS value, ServiceName, TraceId AS trace_id, SpanId AS span_id
FROM otel_traces
WHERE $__timeFilter(Timestamp) AND SpanKind = 'Server'
ORDER BY Duration DESC
LIMIT 100

${MACROS}`;

export const LOG_EXAMPLES = `-- A query returns a time column ("Timestamp", "timestamp" or "time") and, for the log line,
-- a "Body", "message" or "line" column. The other columns are the labels of the log.

-- OpenTelemetry logs
SELECT Timestamp, Body, SeverityText, ServiceName, TraceId, LogAttributes, ResourceAttributes
FROM otel_logs
WHERE $__timeFilter(Timestamp) AND ServiceName IN (\${service:sqlstring})
ORDER BY Timestamp DESC
LIMIT 1000

${MACROS}`;

export const TRACE_EXAMPLES = `-- Either a trace ID (or a variable holding one), to display a trace,
-- or a query returning the "TraceId" and the "Timestamp" of the spans to search for:
-- their traces are then listed, the most recent ones first.

-- Traces with a slow or failed request of a service
SELECT TraceId, Timestamp
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND ServiceName = 'checkout'
  AND (StatusCode = 'Error' OR Duration > 1e9)

-- A trace, from a dashboard variable
$traceId

${MACROS}`;

export const PROFILE_EXAMPLES = `-- A query returns one row per sample, with a "stack" column: the array of the frames of the sample,
-- from the leaf to the root, as in OpenTelemetry. Optional columns: "value" (1 by default),
-- "time" (for the timeline), "unit" and "name".

-- CPU samples of a service, from the OpenTelemetry profiles
SELECT
  Timestamp AS time,
  arrayMap((name, file) -> if(name != '', name, file), FunctionNames, MappingFileNames) AS stack,
  length(TimestampsUnixNano) AS value,
  SampleType AS name,
  SampleUnit AS unit
FROM otel_profiles
WHERE $__timeFilter(Timestamp) AND SampleType = 'samples' AND ServiceName = 'checkout'

${MACROS}`;

export const VARIABLE_EXAMPLES = `-- The values of the variable are the "value" column, or else the first column of the result.
-- An optional "label" column holds the text displayed for each value.

-- Services sending traces
SELECT DISTINCT ServiceName FROM otel_traces WHERE $__timeFilter(Timestamp) ORDER BY ServiceName

-- Values of another variable
SELECT DISTINCT SpanName AS value
FROM otel_traces
WHERE $__timeFilter(Timestamp) AND ServiceName IN (\${service:sqlstring})

${MACROS}`;

export const ANNOTATION_EXAMPLES = `-- A query returns one row per annotation, with a "time" column (or "start" and "end" for a time span).
-- Optional columns: "title" and "legend". The other columns are the tags of the annotation.

-- Errors logged by the services
SELECT Timestamp AS time, Body AS title, ServiceName
FROM otel_logs
WHERE $__timeFilter(Timestamp) AND SeverityNumber >= 17
ORDER BY Timestamp
LIMIT 100

${MACROS}`;
