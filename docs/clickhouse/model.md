# ClickHouse plugin models

This documentation provides the definition of the different plugins related to ClickHouse.

## ClickHouseDatasource

ClickHouse as a datasource is basically an HTTP server. So we need to define an HTTP config.

```yaml
kind: "ClickHouseDatasource"
spec:
  # It is the url of the datasource.
  # Leave it empty if you don't want to access the datasource directly from the UI.
  # You should define a proxy if you want to access the datasource through the Perses' server.
  directUrl: <url> # Optional

  # It is the http configuration that will be used by the Perses' server to redirect to the datasource any query sent by the UI.
  proxy: <HTTP Proxy specification> # Optional
```

### HTTP Proxy specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

### Example

A simple ClickHouse datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "ClickHouseMain"
  project: "analytics"
spec:
  default: true
  plugin:
    kind: "ClickHouseDatasource"
    spec:
      directUrl: "http://clickhouse.example.com:8123"
```

A more complex one:

```yaml
kind: "Datasource"
metadata:
  name: "ClickHouseMain"
  project: "analytics"
spec:
  default: true
  plugin:
    kind: "ClickHouseDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://clickhouse.example.com:8123"
          allowedEndpoints:
            - endpointPattern: "/?"
              method: "POST"
            - endpointPattern: "/ping"
              method: "GET"
          secret: "clickhouse_secret_config"
```

## ClickHouseTimeSeriesQuery

Perses supports time series queries for ClickHouse: `ClickHouseTimeSeriesQuery`.

```yaml
kind: "ClickHouseTimeSeriesQuery"
spec:
  # `query` is the SQL expression for time series data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default ClickHouseDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickHouse Datasource selector> # Optional

  # The output format for the query results
  format: <string> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)

### Example

A simple time series query:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "ClickHouseTimeSeriesQuery"
    spec:
      query: "SELECT toStartOfMinute(timestamp) as time, count() as requests FROM http_logs WHERE timestamp >= now() - INTERVAL 1 HOUR GROUP BY time ORDER BY time"
```

## ClickHouseLogQuery

Perses supports log queries for ClickHouse: `ClickHouseLogQuery`.

```yaml
kind: "ClickHouseLogQuery"
spec:
  # `query` is the SQL expression for log data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default ClickHouseDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickHouse Datasource selector> # Optional

  # The output format for the query results
  format: <string> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)

### Example

A simple log query:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "ClickHouseLogQuery"
    spec:
      query: "SELECT timestamp, level, message, service FROM application_logs WHERE level = 'ERROR' AND timestamp >= now() - INTERVAL 1 HOUR ORDER BY timestamp DESC LIMIT 1000"
```

## ClickHouseTraceQuery

Perses supports trace queries for ClickHouse: `ClickHouseTraceQuery`. It reads traces stored with the schema of the [OpenTelemetry Collector ClickHouse exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter).

```yaml
kind: "ClickHouseTraceQuery"
spec:
  # `query` is either a trace ID or a SQL query.
  # - A trace ID (16 or 32 hexadecimal characters) returns all the spans of this trace, read from `table`.
  # - A SQL query must return one row per span. The spans are grouped by trace into search results.
  query: <string>

  # `table` is the table storing the spans, optionally prefixed with its database.
  # It is only used to look up a trace by ID.
  table: <string> | default = "otel_traces" # Optional

  # `limit` is the maximum number of traces returned by a search.
  limit: <int> | default = 20 # Optional

  # `datasource` is a datasource selector. If not provided, the default ClickHouseDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickHouse Datasource selector> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)

### Trace ID lookup

A trace ID returns all the spans of this trace from `table`, whatever the time range of the dashboard, so that a trace can be opened from a link.

!!! note
    The lookup is not bounded by time: it relies on the bloom filter index the exporter creates on `TraceId`. On large tables, a lookup bounded with the exporter's `<table>_trace_id_ts` table (`otel_traces_trace_id_ts` by default), which maps each trace ID to its start and end time, can be faster. That table is not used because it only exists when the exporter created the schema. This choice may be revisited, for example with an option to use it.

### Search query columns

A search query must return one row per span, with the column names of the exporter schema:

| Column         | Required | Usage                                                                                  |
|----------------|----------|----------------------------------------------------------------------------------------|
| `TraceId`      | Yes      | Groups the spans into traces.                                                          |
| `Timestamp`    | Yes      | Start time of the span. Values without a timezone are read as UTC.                     |
| `Duration`     | No       | Duration of the span in nanoseconds, used to compute the duration of the trace.        |
| `ParentSpanId` | No       | Identifies the root span, which names the trace. Otherwise the earliest span is used. |
| `SpanName`     | No       | Name of the trace, taken from its root span.                                           |
| `ServiceName`  | No       | Counts the spans of each service.                                                      |
| `StatusCode`   | No       | Counts the spans with an error in each service.                                        |

The span counts and the root span are computed from the returned spans only. To list whole traces, select the trace IDs in a subquery, as in the example below.

Like the other ClickHouse queries, `{start}` and `{end}` are replaced with the time range of the dashboard.

### Example

A trace search listing the traces that went through the `checkout` service:

```yaml
kind: "TraceQuery"
spec:
  plugin:
    kind: "ClickHouseTraceQuery"
    spec:
      query: |
        SELECT TraceId, ParentSpanId, SpanName, ServiceName, Timestamp, Duration, StatusCode
        FROM otel.otel_traces
        WHERE Timestamp BETWEEN '{start}' AND '{end}'
          AND TraceId IN (
            SELECT TraceId FROM otel.otel_traces
            WHERE ServiceName = 'checkout' AND Timestamp BETWEEN '{start}' AND '{end}'
          )
      limit: 50
```

A trace lookup, for example in a Tracing Gantt Chart panel showing the trace selected in the `traceId` variable:

```yaml
kind: "TraceQuery"
spec:
  plugin:
    kind: "ClickHouseTraceQuery"
    spec:
      query: "$traceId"
      table: "otel.otel_traces"
```

## Shared definitions

### ClickHouse Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "ClickHouseDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
