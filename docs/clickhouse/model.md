# ClickHouse plugin models

This documentation provides the definition of the different plugins related to ClickHouse and ClickStack.

See [Writing queries](./queries.md) for the SQL each query expects.

## ClickHouseDatasource

ClickHouse as a datasource is basically an HTTP server. So we need to define an HTTP config.

```yaml
kind: "ClickHouseDatasource"
spec:
  # It is the url of the HTTP interface of ClickHouse.
  # Leave it empty if you don't want to access the datasource directly from the UI.
  # You should define a proxy if you want to access the datasource through the Perses' server.
  directUrl: <url> # Optional

  # It is the http configuration that will be used by the Perses' server to redirect to the datasource any query sent by the UI.
  proxy: <HTTP Proxy specification> # Optional

  # The database the table names without a database are read from.
  # By default, it is the database named `default`.
  database: <string> # Optional
```

Queries are sent with `POST` on the root path of the HTTP interface, and the connection test calls `GET /ping`: these are the two endpoints a proxy has to allow. A proxy that only allows `GET` on the root path still works: queries are then sent in the URL, which limits their size.

The plugin asks ClickHouse to run every query as read-only, but a datasource is only as restricted as its ClickHouse user: use a user that is only granted `SELECT` on the tables to display.

With a direct URL, the browser calls ClickHouse itself, without credentials: it only works with a ClickHouse user that needs no password.

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
      database: "otel"
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://clickhouse.example.com:8123"
          allowedEndpoints:
            - endpointPattern: "^/$"
              method: "POST"
            - endpointPattern: "^/ping$"
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

  # The format of the names of the series. Each `{{label}}` is replaced by the value of the label of the series.
  seriesNameFormat: <string> # Optional

  # The SQL expression returning the exemplars of the series.
  exemplarQuery: <string> # Optional

  # The lower bound of the interval of the query, which is the value of the `$__interval_s` family of macros.
  # A duration, such as `1m`, or a variable holding one.
  minStep: <duration> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)
- See [Writing time series queries](./queries.md#time-series-queries)
- See [Min step](./queries.md#min-step)

### Example

A simple time series query:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "ClickHouseTimeSeriesQuery"
    spec:
      query: "SELECT $__timeInterval(Timestamp) AS time, ServiceName, count() AS requests FROM otel_traces WHERE $__timeFilter(Timestamp) GROUP BY time, ServiceName ORDER BY time"
      seriesNameFormat: "{{ServiceName}}"
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
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)
- See [Writing log queries](./queries.md#log-queries)

### Example

A simple log query:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "ClickHouseLogQuery"
    spec:
      query: "SELECT Timestamp, Body, SeverityText, ServiceName FROM otel_logs WHERE $__timeFilter(Timestamp) AND SeverityText = 'ERROR' ORDER BY Timestamp DESC LIMIT 1000"
```

## ClickHouseTraceQuery

Perses supports trace queries for ClickHouse: `ClickHouseTraceQuery`.

```yaml
kind: "ClickHouseTraceQuery"
spec:
  # `query` is either a trace ID, or a variable holding one, to read a trace,
  # or the SQL expression returning the `TraceId` and `Timestamp` columns of the spans to search for.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default ClickHouseDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickHouse Datasource selector> # Optional

  # The table of the spans, in the schema of the ClickHouse exporter of the OpenTelemetry Collector:
  # `table` or `database.table`. By default, it is `otel_traces`.
  table: <string> # Optional

  # The maximum number of traces returned by a search. By default, it is 20.
  limit: <int> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)
- See [Writing trace queries](./queries.md#trace-queries)

### Example

A trace search:

```yaml
kind: "TraceQuery"
spec:
  plugin:
    kind: "ClickHouseTraceQuery"
    spec:
      query: "SELECT TraceId, Timestamp FROM otel_traces WHERE $__timeFilter(Timestamp) AND StatusCode = 'Error'"
      limit: 50
```

A trace, whose ID is the value of a variable:

```yaml
kind: "TraceQuery"
spec:
  plugin:
    kind: "ClickHouseTraceQuery"
    spec:
      query: "$traceId"
```

## ClickHouseProfileQuery

Perses supports profile queries for ClickHouse: `ClickHouseProfileQuery`.

```yaml
kind: "ClickHouseProfileQuery"
spec:
  # `query` is the SQL expression returning the samples of the profile,
  # with the frames of each sample in a `stack` column.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default ClickHouseDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickHouse Datasource selector> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)
- See [Writing profile queries](./queries.md#profile-queries)

### Example

```yaml
kind: "ProfileQuery"
spec:
  plugin:
    kind: "ClickHouseProfileQuery"
    spec:
      query: "SELECT Timestamp AS time, FunctionNames AS stack, length(TimestampsUnixNano) AS value FROM otel_profiles WHERE $__timeFilter(Timestamp) AND ServiceName = 'checkout'"
```

## ClickHouseSQLVariable

Perses supports variables listed by a ClickHouse query: `ClickHouseSQLVariable`.

```yaml
kind: "ClickHouseSQLVariable"
spec:
  # `query` is the SQL expression returning the values of the variable.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default ClickHouseDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickHouse Datasource selector> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)
- See [Writing variable queries](./queries.md#variable-queries)

### Example

```yaml
kind: "ListVariable"
spec:
  name: "service"
  allowAllValue: true
  allowMultiple: true
  plugin:
    kind: "ClickHouseSQLVariable"
    spec:
      query: "SELECT DISTINCT ServiceName FROM otel_traces WHERE $__timeFilter(Timestamp) ORDER BY ServiceName"
```

## ClickHouseSQLAnnotation

Perses supports annotations read by a ClickHouse query: `ClickHouseSQLAnnotation`.

```yaml
kind: "ClickHouseSQLAnnotation"
spec:
  # `query` is the SQL expression returning one row per annotation.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default ClickHouseDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickHouse Datasource selector> # Optional
```

- See [ClickHouse Datasource selector](#clickhouse-datasource-selector)
- See [Writing annotation queries](./queries.md#annotation-queries)

### Example

```yaml
display:
  name: "Deployments"
plugin:
  kind: "ClickHouseSQLAnnotation"
  spec:
    query: "SELECT deployed_at AS time, version AS title, service FROM deployments WHERE $__timeFilter(deployed_at)"
```

## ClickStackDatasource

The API of ClickStack (HyperDX) is an HTTP server. So we need to define an HTTP config.

```yaml
kind: "ClickStackDatasource"
spec:
  # It is the url of the API of ClickStack.
  # Leave it empty if you don't want to access the datasource directly from the UI.
  # You should define a proxy if you want to access the datasource through the Perses' server.
  directUrl: <url> # Optional

  # It is the http configuration that will be used by the Perses' server to redirect to the datasource any query sent by the UI.
  proxy: <HTTP Proxy specification> # Optional

  # The url of the ClickStack UI, as users open it in their browser.
  # The alerts link to it. Without it, the alerts have no link.
  uiUrl: <url> # Optional
```

The URL is the one of the API of ClickStack, without its `/api/v2` path: `http://<host>:8000`, or `http://<host>:8080/api` when only the port of the UI is reachable.

ClickStack only accepts the requests of the browsers of its own UI, and requires an API key. Use a proxy, with a [secret](https://perses.dev/perses/docs/api/secret/) holding the API key of ClickStack as a bearer token. The key is an API key of ClickStack, found in its team settings. It is not the ingestion key.

The plugin calls `GET /api/v2/alerts`, and the connection test `GET /api/v2`: these are the two endpoints a proxy has to allow.

### Example

```yaml
kind: "GlobalDatasource"
metadata:
  name: "clickstack"
spec:
  default: true
  plugin:
    kind: "ClickStackDatasource"
    spec:
      uiUrl: "https://clickstack.example.com"
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://clickstack.example.com:8000"
          allowedEndpoints:
            - endpointPattern: "^/api/v2/alerts$"
              method: "GET"
            - endpointPattern: "^/api/v2$"
              method: "GET"
          secret: "clickstack_api_key"
```

With the secret:

```yaml
kind: "GlobalSecret"
metadata:
  name: "clickstack_api_key"
spec:
  authorization:
    type: "Bearer"
    credentials: "<ClickStack API key>"
```

## ClickStackAlertsQuery

Perses supports listing the alerts of ClickStack: `ClickStackAlertsQuery`.

```yaml
kind: "ClickStackAlertsQuery"
spec:
  # `datasource` is a datasource selector. If not provided, the default ClickStackDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <ClickStack Datasource selector> # Optional

  # Only the alerts in one of these states: `ALERT` (firing), `PENDING` or `OK`.
  # By default, the firing and the pending alerts are listed.
  states:
    - <string> # Optional

  # Only the alerts watching one of these kinds of sources: `saved_search`, `tile` or `inline`.
  # By default, all the alerts are listed.
  sources:
    - <string> # Optional

  # Only the alerts with one of these tags.
  # Variables are supported: a variable with several values is as many tags.
  tags:
    - <string> # Optional

  # Only the alerts whose name contains this text. Variables are supported.
  search: <string> # Optional
```

- See [ClickStack Datasource selector](#clickstack-datasource-selector)

Each alert of ClickStack is returned with:

| Field         | Value                                                                                                                                                                                                                     |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`        | The name of the alert: the one it was given, or else the name of the saved search or of the dashboard tile it watches.                                                                                                    |
| `state`       | `firing` for `ALERT`, `pending` for `PENDING`, `inactive` otherwise.                                                                                                                                                      |
| `labels`      | `alertname`, `source`, `interval`, `group_by`, and the tags of the alert: a `key:value` tag is the label `key`, and the other tags are joined in the `tags` label.                                                        |
| `severity`    | The `severity` label, as set by a `severity:<value>` tag. ClickStack alerts have no severity of their own.                                                                                                                |
| `annotations` | `message`, `note`, `condition` (such as `>= 100 over 5m`), `title` (the title of the notifications), `error` (the last execution error) and `silenced_until`. A note that is a link is also the `runbook_url` annotation. |
| `suppressed`  | `true` while the alert is silenced.                                                                                                                                                                                       |
| `sourceURL`   | The link to the saved search, the dashboard tile or the chart the alert watches, when the datasource has a `uiUrl`.                                                                                                       |
| `startsAt`    | The time of the last evaluation of the alert. ClickStack does not tell when an alert started firing.                                                                                                                      |

An alert grouped by a column is a single alert, in the worst state of its groups.

### Example

The alerts of a team, in an alert table:

```yaml
kind: "Panel"
spec:
  display:
    name: "ClickStack alerts"
  plugin:
    kind: "AlertTable"
    spec:
      # Alerts are silenced in ClickStack: the silence action of the table is for Alertmanager.
      allowedActions: ["runbook"]
      columns:
        - name: "severity"
          sortMode: "severity"
      labelColorMappings:
        - labelKey: "severity"
          mode: "severity"
  queries:
    - kind: "AlertsQuery"
      spec:
        plugin:
          kind: "ClickStackAlertsQuery"
          spec:
            states: ["ALERT", "PENDING", "OK"]
            tags: ["team:$team"]
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

### ClickStack Datasource selector

```yaml
kind: "ClickStackDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
