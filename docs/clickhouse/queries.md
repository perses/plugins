# Writing ClickHouse queries

Every ClickHouse plugin runs a SQL statement that you write. This page describes what the plugins add to SQL, the macros and the variables, and the columns each plugin expects.

## How queries are run

- A query is a single `SELECT` statement, sent to the HTTP interface of ClickHouse as read-only.
- The plugins choose the format of the results: a final `FORMAT` clause is ignored.
- Table names without a database are read from the database of the [datasource](./model.md#clickhousedatasource), which is `default` unless the datasource names another one.
- At most 100 000 rows are read. A panel warns when the result of its query was cut.
- The error of a failed query is the one of ClickHouse.

## Time range and interval

Macros give a query the time range of the dashboard and an interval suited to it. Their names and their results follow the ClickHouse datasource of Grafana.

| Macro                                       | Replaced by                                                                                  |
|---------------------------------------------|----------------------------------------------------------------------------------------------|
| `$__timeFilter(column)`                     | `(column >= toDateTime(<start>) AND column <= toDateTime(<end>))`, to the second             |
| `$__timeFilter_ms(column)`                  | The same condition, to the millisecond                                                       |
| `$__dateFilter(column)`                     | The same condition on a `Date` column                                                        |
| `$__dateTimeFilter(dateColumn, timeColumn)` | The conditions on a `Date` column, widened by a day on each side, and on a `DateTime` column, for tables partitioned by date |
| `$__timeInterval(column)`                   | `toStartOfInterval(toDateTime(column), INTERVAL <interval> second)`                          |
| `$__timeInterval_ms(column)`                | `toStartOfInterval(toDateTime64(column, 3), INTERVAL <interval> millisecond)`                |
| `$__interval_s`, `$__interval_ms`           | The interval, in seconds or in milliseconds                                                  |
| `$__fromTime`, `$__toTime`                  | The start and the end of the time range, as `DateTime`                                       |
| `$__fromTime_ms`, `$__toTime_ms`            | The start and the end of the time range, as `DateTime64(3)`                                  |
| `$__conditionalAll(condition, $variable)`   | The condition, or `1=1` when "All" is selected for the variable                              |

The interval is a round duration, from 1 second to 30 days. For a time series query it is at least the interval between two points the panel can draw, which depends on the width of the panel. For the other queries it splits the time range in about 300 intervals.

```sql
SELECT
  $__timeInterval(Timestamp) AS time,
  ServiceName,
  count() / $__interval_s AS rps
FROM otel_traces
WHERE $__timeFilter(Timestamp) AND SpanKind = 'Server'
GROUP BY time, ServiceName
ORDER BY time
```

The `{start}` and `{end}` placeholders are also replaced by the time range, as `YYYY-MM-DD hh:mm:ss` in UTC: `WHERE Timestamp BETWEEN '{start}' AND '{end}'`.

Macros are not replaced in comments. Inside a string, only the ones without arguments are: `'$__interval_s'` is, `'%$__timeFilter%'` is not.

### Min step

A time series query can set a **min step**, the lower bound of its interval: a duration such as `1m`, or a variable holding one.

A wide panel on a short time range asks for an interval of a few seconds. When the data is written less often, by sources that do not write at the same time, an interval only holds the points of some of the sources: an aggregate over the sources is wrong, and a chart draws gaps between the points. Set the min step to the interval the data is written at.

## Variables

Queries can use the variables of the dashboard: `$name`, `${name}` or `${name:format}`, with the [interpolation formats](https://perses.dev/perses/docs/concepts/variable/#using-variables) of Perses.

Use the `sqlstring` format wherever a value is a string. It quotes each value as a ClickHouse string literal, and separates several values with commas:

```sql
WHERE ServiceName IN (${service:sqlstring})
```

A variable with "All" selected holds every value. To drop the condition instead of listing them all, wrap it in `$__conditionalAll`:

```sql
WHERE $__conditionalAll(ServiceName IN (${service:sqlstring}), $service)
```

Variables are not replaced in comments: a value could end the comment.

## Time series queries

The columns of the result tell what the rows are:

- The **time** of a row is its column named `time`, `timestamp` or `TimeUnix`, whatever the case, or else its first `Date` or `DateTime` column.
- **Values** are the numeric columns: integers, floats, decimals and booleans.
- **Labels** are all the other columns. The rows are split in one series per combination of their values. A `Map`, `Tuple` or `JSON` column gives one label per key, named `<column>.<key>`. Array columns are ignored.

A series is named after its labels, as `{ServiceName="checkout"}`. Without label columns it is named after its value column. With several value columns it is named after both, as `p95{ServiceName="checkout"}`, and the name of its value column is its `__name__` label. Set the **series name format** of the query to choose the names: `{{ServiceName}}` is replaced by the value of the label.

A query returns at most 1 000 series.

### Interval of the points

Charts draw the points of a series at regular intervals, and join the ones that follow each other. This interval is worked out from the rows of the query:

- When most rows of a series are at about the same interval, it is this interval. A metric written every minute is drawn as a line, even by a query grouping its rows by a shorter interval, and so are the months of a year.
- Otherwise it is the longest interval all the rows are on. A series with more holes than rows keeps its rows where they are, and is drawn with gaps.

Rows that are not at regular intervals, such as the rows of a table of events, are drawn at the closest place a chart has for them. When several rows of a series are too close to each other to be drawn, only the last one is, and the panel warns about it: aggregate the rows over time.

### Gaps

ClickHouse returns no row for an interval without data, which a chart draws as a gap. To get a zero instead, ask ClickHouse to fill the intervals. Order by the label columns first: each series is then filled on its own.

```sql
SELECT $__timeInterval(Timestamp) AS time, ServiceName, count() AS errors
FROM otel_traces
WHERE $__timeFilter(Timestamp) AND StatusCode = 'Error'
GROUP BY time, ServiceName
ORDER BY ServiceName, time WITH FILL STEP $__interval_s
```

### Tables

A query without a time column is a table: each row is a series of one point, at the end of the time range, even when the labels of two rows are the same, and the series keep the order of the rows. Use it for the stat, gauge, bar and table panels.

```sql
SELECT ServiceName, count() AS spans, quantile(0.95)(Duration) / 1e6 AS p95_ms
FROM otel_traces
WHERE $__timeFilter(Timestamp)
GROUP BY ServiceName
ORDER BY spans DESC
LIMIT 10
```

In a table panel, each series is a row with the labels of the series and its value. To get one column per value column of the query:

- When the rows have a single label column, as above, add the `PivotByLabel` transform to the panel, with `__name__` as column label and the label column, here `ServiceName`, as row field.
- Otherwise, use one query per value column and the `MergeSeries` transform.

### OpenTelemetry metrics

The rows of the metric tables of the ClickHouse exporter can be read as they are. The names of the service and of the metric, and the resource, scope and data point attributes, are the labels of the series.

```sql
SELECT * FROM otel_metrics_gauge
WHERE $__timeFilter(TimeUnix) AND MetricName = 'system.memory.utilization'
```

Most often a query aggregates them:

```sql
SELECT
  $__timeInterval(TimeUnix) AS time,
  Attributes['state'] AS state,
  avg(Value) AS value
FROM otel_metrics_gauge
WHERE $__timeFilter(TimeUnix) AND MetricName = 'system.memory.utilization'
GROUP BY time, state
ORDER BY time
```

A metric has a point every time it is exported, every minute by default. Set the [min step](#min-step) of the query to this interval when the points of the metric come from several sources, such as the instances of a service.

OpenTelemetry sums are usually cumulative. Their rate is the increase of each series since its previous point, divided by the time between the two. Dividing by the interval would be wrong when the metric is exported less often:

```sql
SELECT time, ServiceName, sum(rate) AS value
FROM (
  SELECT
    $__timeInterval(TimeUnix) AS time,
    ServiceName,
    Attributes,
    max(Value) AS last,
    lagInFrame(last, 1, last) OVER series AS previous,
    lagInFrame(time, 1, time) OVER series AS previousTime,
    greatest(last - previous, 0) / greatest(dateDiff('second', previousTime, time), 1) AS rate
  FROM otel_metrics_sum
  WHERE $__timeFilter(TimeUnix) AND MetricName = 'traces.span.metrics.calls'
  GROUP BY time, ServiceName, Attributes
  WINDOW series AS (PARTITION BY ServiceName, Attributes ORDER BY time)
)
GROUP BY time, ServiceName
ORDER BY time
```

### Histograms

A result with the histogram columns of OpenTelemetry returns histograms, which the heat map and histogram panels display:

- `BucketCounts` and `ExplicitBounds` for an explicit bucket histogram.
- `Scale`, `ZeroCount`, `PositiveOffset`, `PositiveBucketCounts`, `NegativeOffset` and `NegativeBucketCounts` for an exponential histogram.
- `Count` and `Sum`, optional, for both.

The histograms of OpenTelemetry are usually cumulative. This query returns the buckets of each interval, for a heat map:

```sql
SELECT time, sumForEach(delta) AS BucketCounts, any(bounds) AS ExplicitBounds
FROM (
  SELECT
    time,
    bounds,
    arrayMap((count, previous) -> toUInt64(greatest(toInt64(count) - toInt64(previous), 0)),
      counts, lagInFrame(counts, 1, counts) OVER (PARTITION BY ServiceName, Attributes ORDER BY time)) AS delta
  FROM (
    SELECT
      $__timeInterval(TimeUnix) AS time,
      ServiceName,
      Attributes,
      argMax(BucketCounts, TimeUnix) AS counts,
      any(ExplicitBounds) AS bounds
    FROM otel_metrics_histogram
    WHERE $__timeFilter(TimeUnix) AND MetricName = 'traces.span.metrics.duration'
    GROUP BY time, ServiceName, Attributes
  )
)
GROUP BY time
ORDER BY time
```

### Exemplars

Exemplars are read from two places:

- The exemplar columns of the OpenTelemetry metric tables, when the query returns them: `Exemplars.TimeUnix`, `Exemplars.Value`, `Exemplars.TraceId`, `Exemplars.SpanId` and `Exemplars.FilteredAttributes`.
- The **exemplar query** of the time series query. Each of its rows is an exemplar: a time column, a `value` column, the label columns of the series it belongs to, and any other column as a label of the exemplar. When the query returns several value columns, the exemplars belong to the series of the first one: return the name of another one in a `__name__` column to attach them to its series.

```sql
SELECT Timestamp AS time, Duration / 1e6 AS value, ServiceName, TraceId AS trace_id, SpanId AS span_id
FROM otel_traces
WHERE $__timeFilter(Timestamp) AND SpanKind = 'Server'
ORDER BY Duration DESC
LIMIT 100
```

## Log queries

Each row is a log:

- Its **time** is its column named `Timestamp`, `log_time` or `time`, whatever the case, or else its first `Date` or `DateTime` column.
- Its **line** is its column named `Body`, `message`, `msg`, `line` or `log`. A log without a line, such as an OpenTelemetry event, is described by its labels.
- Its **labels** are its other columns. A `Map` column gives one label per key, named `<column>.<key>`. Empty values are left out.
- Its **level**, which colors it, is its `level` label. When the query does not return one, it is taken from the `SeverityText` column, or else from the `SeverityNumber` column.

```sql
SELECT Timestamp, Body, SeverityText, ServiceName, TraceId, LogAttributes
FROM otel_logs
WHERE $__timeFilter(Timestamp) AND ServiceName IN (${service:sqlstring})
ORDER BY Timestamp DESC
LIMIT 1000
```

In the log explorer, the volume of the logs is charted above them. It counts, by interval and by level, all the logs matching the query, whatever its `ORDER BY` and `LIMIT` clauses. It is not charted for a query that does not select its time column by name, or that uses `UNION` or `LIMIT BY`.

## Trace queries

Traces are read from a table in the schema of the ClickHouse exporter of the OpenTelemetry Collector, which is also the schema of ClickStack: `otel_traces` by default, or the **trace table** of the query.

The query is either:

- A **trace ID**, or a variable holding one. It returns the trace, for the Gantt chart. The trace is looked for whatever the time range of the dashboard.
- A **search**: a SQL query returning the `TraceId` and `Timestamp` columns of the spans to search for. It returns the traces of these spans, the most recent ones first, for the trace table and the scatter chart. Each trace is summarized from all its spans, not only the ones the query returns.

```sql
SELECT TraceId, Timestamp
FROM otel_traces
WHERE $__timeFilter(Timestamp)
  AND ServiceName = 'checkout'
  AND (StatusCode = 'Error' OR Duration > 1e9)
```

A search returns 20 traces by default: change the **limit** of the query for more.

To open a trace from a trace table, link the table to a dashboard with a text variable and a Gantt chart whose query is the variable, as `$traceId`.

## Profile queries

A profile query returns one row per sample, or group of samples:

- `stack`, required: the array of the frames of the sample, from the leaf to the root, as in the OpenTelemetry profiles.
- `value`: the value of the sample. Without this column, each row counts for 1.
- `time`: the time of the sample, for the timeline above the flame graph.
- `name` and `unit`: the name and the unit of the values, such as `nanoseconds`, `bytes` or `count`.

ClickHouse adds the samples up by stack and by interval: only the flame graph and the timeline are sent to the browser.

```sql
SELECT
  Timestamp AS time,
  arrayMap((name, file) -> if(name != '', name, file), FunctionNames, MappingFileNames) AS stack,
  length(TimestampsUnixNano) AS value,
  SampleType AS name,
  SampleUnit AS unit
FROM otel_profiles
WHERE $__timeFilter(Timestamp) AND SampleType = 'samples' AND ServiceName = 'checkout'
```

A query can build its own stacks. This one shows the function on CPU under its service:

```sql
SELECT
  [if(FunctionNames[1] != '', FunctionNames[1], MappingFileNames[1]), ServiceName] AS stack,
  length(TimestampsUnixNano) AS value
FROM otel_profiles
WHERE $__timeFilter(Timestamp) AND SampleType = 'samples'
```

!!! note
    Perses does not give the variables of the dashboard to profile queries yet. A profile query can use the macros, but not variables.

## Variable queries

The values of the variable are the `value` column of the result, or else its first column. An optional `label` column holds the text displayed for each value. Empty and repeated values are left out.

```sql
SELECT DISTINCT SpanName AS value
FROM otel_traces
WHERE $__timeFilter(Timestamp) AND ServiceName IN (${service:sqlstring})
ORDER BY value
```

## Annotation queries

Each row is an annotation:

- Its **time** is its column named `start`, `time` or `timestamp`, or else its first `Date` or `DateTime` column.
- An `end` column makes it a time span.
- The `title` and `legend` columns are its texts.
- Its other columns are its tags.

```sql
SELECT Timestamp AS time, Body AS title, ServiceName
FROM otel_logs
WHERE $__timeFilter(Timestamp) AND SeverityNumber >= 17
ORDER BY Timestamp
LIMIT 100
```
