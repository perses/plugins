# Trino plugin models

This documentation provides the definition of the different plugins related to Trino.

## TrinoDatasource

Trino as a datasource is an HTTP server, so it is defined with an HTTP config.

```yaml
kind: "TrinoDatasource"
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

The proxy must allow `POST /v1/statement` and `GET` and `DELETE` on `/v1/statement/.*`. Unless Trino sets
`http-server.process-forwarded=true`, it answers HTTP 406 to any `X-Forwarded-*` header, so restrict the forwarded
headers with `allowHeaders`. Any header set in `headers` must also be listed there.

`X-Trino-Client-Capabilities` is sent by the trace query only, to receive `timestamp(9)` values with their nanoseconds. A
proxy that does not allow it still works: trace timestamps then have millisecond precision.

To use a shared Trino account, set `X-Trino-User` in `headers`: Perses applies it on the server and replaces any value
sent by the browser. To run queries as the viewer, set `oauthPassthrough: true` instead and let Trino take the user
from the verified token.

### Example

A simple Trino datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "TrinoMain"
  project: "analytics"
spec:
  default: true
  plugin:
    kind: "TrinoDatasource"
    spec:
      directUrl: "http://trino.example.com:8080"
```

A proxied one with a shared account:

```yaml
kind: "Datasource"
metadata:
  name: "TrinoMain"
  project: "analytics"
spec:
  default: true
  plugin:
    kind: "TrinoDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "https://trino.example.com"
          allowedEndpoints:
            - endpointPattern: "/v1/statement"
              method: "POST"
            - endpointPattern: "/v1/statement/.*"
              method: "GET"
            - endpointPattern: "/v1/statement/.*"
              method: "DELETE"
          allowHeaders:
            - "Content-Type"
            - "X-Trino-User"
            - "X-Trino-Catalog"
            - "X-Trino-Schema"
            - "X-Trino-Session"
            - "X-Trino-Source"
            - "X-Trino-Time-Zone"
            - "X-Trino-Routing-Group"
            - "X-Trino-Client-Capabilities"
          headers:
            X-Trino-User: "perses"
          secret: "trino_secret_config"
```

## TrinoTimeSeriesQuery

Perses supports time series queries for Trino: `TrinoTimeSeriesQuery`.

```yaml
kind: "TrinoTimeSeriesQuery"
spec:
  # `query` is the SQL expression. It must return a `time` column; number-typed and boolean columns are values and every
  # other column is a label that splits the result into series.
  # `{start}` and `{end}` are replaced by the dashboard time range in UTC.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default TrinoDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Trino Datasource selector> # Optional

  # Sent as X-Trino-Catalog and X-Trino-Schema.
  catalog: <string> # Optional
  schema: <string> # Optional

  # `name=value` entries separated by commas or line breaks, sent as X-Trino-Session.
  sessionProperties: <string> # Optional

  # Sent as X-Trino-Source.
  source: <string> # Optional

  # Sent as X-Trino-Routing-Group, used by Trino Gateway.
  routingGroup: <string> # Optional
```

All string fields accept dashboard variables. Interpolate free-text variables into SQL with `${name:sqlstring}`, which
quotes and escapes the value as a string literal.

- See [Trino Datasource selector](#trino-datasource-selector)

### Example

A simple time series query:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "TrinoTimeSeriesQuery"
    spec:
      query: "SELECT date_trunc('minute', event_time) AS time, count(*) AS events FROM events WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}' GROUP BY 1 ORDER BY 1"
      catalog: "iceberg"
      schema: "analytics"
```

## TrinoLogQuery

Perses supports log queries for Trino: `TrinoLogQuery`.

```yaml
kind: "TrinoLogQuery"
spec:
  # `query` is the SQL expression. The entry time comes from the first column named `timestamp`, `log_time`, or
  # `time` (case-insensitive); every column becomes a label.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default TrinoDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Trino Datasource selector> # Optional

  catalog: <string> # Optional
  schema: <string> # Optional
  sessionProperties: <string> # Optional
  source: <string> # Optional
  routingGroup: <string> # Optional
```

These fields behave as in [TrinoTimeSeriesQuery](#trinotimeseriesquery).

- See [Trino Datasource selector](#trino-datasource-selector)

### Example

A simple log query:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "TrinoLogQuery"
    spec:
      query: "SELECT event_time AS timestamp, level, message FROM app_logs WHERE event_time >= TIMESTAMP '{start}' ORDER BY event_time DESC LIMIT 1000"
```

## TrinoTraceQuery

Perses supports trace queries for Trino: `TrinoTraceQuery`.

```yaml
kind: "TrinoTraceQuery"
spec:
  # `query` is the SQL expression. Every row is a span. `trace_id`, `span_id` and `start_time` are required; the
  # other columns are described in the README. `{start}` and `{end}` are replaced by the dashboard time range in UTC.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default TrinoDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Trino Datasource selector> # Optional

  catalog: <string> # Optional
  schema: <string> # Optional
  sessionProperties: <string> # Optional
  source: <string> # Optional
  routingGroup: <string> # Optional
```

These fields behave as in [TrinoTimeSeriesQuery](#trinotimeseriesquery).

Columns are matched case-insensitively:

| Column                                                                             | Required | Meaning                                                                                                                                                       |
|------------------------------------------------------------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `trace_id`, `span_id`                                                              | yes      | Ids. A `varbinary` column is converted to lowercase hex.                                                                                                      |
| `start_time` (or `timestamp`)                                                      | yes      | Span start. `timestamp(9)` keeps nanoseconds, a number is epoch milliseconds.                                                                                 |
| `end_time`, `duration_ms`, `duration_nano`                                         | no       | Span end, or its duration in milliseconds or nanoseconds (`duration_ns` also works).                                                                          |
| `parent_span_id`, `service_name`, `span_name`                                      | no       | An empty or null parent marks a root span. `service_name` defaults to `unknown` and `span_name` to `(unknown span)`.                                          |
| `status_code` (or `span_status_code`), `status_message` (or `span_status_message`) | no       | The span is an error when the code is `ERROR`, `STATUS_CODE_ERROR` or `2`. The message is optional.                                                           |
| `attributes`                                                                       | no       | A Trino `map`, a JSON object, or a JSON string. Any other value becomes one attribute.                                                                        |
| `span_kind`, `scope_name`, `scope_version`                                         | no       | Span kind and instrumentation scope. The kind is a number 0-5, a bare name such as `SERVER`, or `SPAN_KIND_SERVER`; anything else is `SPAN_KIND_UNSPECIFIED`. |
| `span_attributes.*`, `resource_attributes.*`                                       | no       | One span or resource attribute per column, as in the GreptimeDB trace query.                                                                                  |

Rows without a `trace_id`, `span_id` or parseable start time are skipped with a warning. A result with exactly one
distinct `trace_id` returns only the full trace, for the TracingGanttChart panel, like a Tempo trace id lookup. A search
that matches exactly one trace is shown as that trace, so TraceTable and ScatterChart see no search results for it.

!!! note
    Trino only sends `timestamp(9)` values with their nanoseconds to clients that ask for them. The trace query asks with
    the `X-Trino-Client-Capabilities: PARAMETRIC_DATETIME` header, so a proxy datasource must list that header in
    `allowHeaders` (the editor's proxy default does). Without it the query still works, with millisecond precision.

- See [Trino Datasource selector](#trino-datasource-selector)

### Example

A search for the 100 latest traces of a service in the time range, with all their spans, for a TraceTable or ScatterChart. Spans of a picked trace that start before `{start}` are left
out:

```yaml
kind: "TraceQuery"
spec:
  plugin:
    kind: "TrinoTraceQuery"
    spec:
      query: |
        WITH recent AS (
          SELECT trace_id
          FROM iceberg.otel.spans
          WHERE service_name IN (${service:sqlstring})
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
```

A single trace for a TracingGanttChart, using a `trace_id` variable and `duration_ms` instead of `end_time`:

```yaml
kind: "TraceQuery"
spec:
  plugin:
    kind: "TrinoTraceQuery"
    spec:
      query: |
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
        WHERE trace_id = from_hex(${trace_id:sqlstring})
        ORDER BY start_time
```

## TrinoJsonQuery

Perses supports JSON queries for Trino: `TrinoJsonQuery`.

```yaml
kind: "TrinoJsonQuery"
spec:
  # `query` is the SQL expression. Every row becomes an object keyed by column name. Integer-like column names come first and a repeated column name keeps only the last value.
  # `{start}` and `{end}` are NOT replaced: a JSON query has no dashboard time range.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default TrinoDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Trino Datasource selector> # Optional

  catalog: <string> # Optional
  schema: <string> # Optional
  sessionProperties: <string> # Optional
  source: <string> # Optional
  routingGroup: <string> # Optional
```

These fields behave as in [TrinoTimeSeriesQuery](#trinotimeseriesquery). Results over 100,000 rows are cut with a
warning, like the other queries.

- See [Trino Datasource selector](#trino-datasource-selector)

### Example

A top-N table of services by error count over the last hour, using the current time instead of `{start}`:

```yaml
kind: "JsonQuery"
spec:
  plugin:
    kind: "TrinoJsonQuery"
    spec:
      query: |
        SELECT
          service_name,
          count(*) AS spans,
          count_if(status_code = 'ERROR') AS errors,
          round(100e0 * count_if(status_code = 'ERROR') / count(*), 2) AS error_pct
        FROM iceberg.otel.spans
        WHERE start_time > current_timestamp - INTERVAL '1' HOUR
        GROUP BY service_name
        ORDER BY errors DESC, spans DESC
        LIMIT 10
```

An inventory without any time column:

```yaml
kind: "JsonQuery"
spec:
  plugin:
    kind: "TrinoJsonQuery"
    spec:
      query: "SELECT host_id, hostname, coalesce(region, 'unknown') AS region FROM iceberg.ops.hosts ORDER BY region, hostname"
```

## TrinoSQLVariable

Perses supports list variables filled from Trino: `TrinoSQLVariable`.

```yaml
kind: "TrinoSQLVariable"
spec:
  # `query` is the SQL expression. The first column is the value and an optional second column is the display label.
  # Nulls are skipped and duplicate values are removed. Only the first 10,000 rows are read: the query is cancelled
  # there and later rows are dropped without a warning.
  # It can use other variables, and `{start}` and `{end}` for the dashboard time range in UTC.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default TrinoDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Trino Datasource selector> # Optional

  catalog: <string> # Optional
  schema: <string> # Optional
  sessionProperties: <string> # Optional
  source: <string> # Optional
  routingGroup: <string> # Optional
```

These fields behave as in [TrinoTimeSeriesQuery](#trinotimeseriesquery).

- See [Trino Datasource selector](#trino-datasource-selector)

### Example

A region picker:

```yaml
kind: "ListVariable"
spec:
  name: "region"
  plugin:
    kind: "TrinoSQLVariable"
    spec:
      query: "SELECT DISTINCT region FROM iceberg.ops.hosts WHERE region IS NOT NULL ORDER BY region"
```

A value with a display label:

```yaml
kind: "ListVariable"
spec:
  name: "host"
  plugin:
    kind: "TrinoSQLVariable"
    spec:
      query: |
        SELECT host_id AS value, concat(hostname, ' (', coalesce(region, 'unknown'), ')') AS label
        FROM iceberg.ops.hosts
        ORDER BY label
```

A variable that depends on another variable and on the time range:

```yaml
kind: "ListVariable"
spec:
  name: "service"
  plugin:
    kind: "TrinoSQLVariable"
    spec:
      query: |
        SELECT DISTINCT service_name
        FROM iceberg.otel.spans
        WHERE start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
          AND element_at(attributes, 'deployment.environment') = ${env:sqlstring}
        ORDER BY service_name
```

## Shared definitions

### Trino Datasource selector

!!! note
See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "TrinoDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
