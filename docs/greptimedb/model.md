# GreptimeDB plugin models

This documentation provides the definition of the different plugins related to GreptimeDB.

## GreptimeDBDatasource

GreptimeDB as a datasource is an HTTP SQL API server. So we need to define an HTTP config.

```yaml
kind: "GreptimeDBDatasource"
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

A simple GreptimeDB datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "GreptimeDBMain"
  project: "observability"
spec:
  default: true
  plugin:
    kind: "GreptimeDBDatasource"
    spec:
      directUrl: "http://localhost:4000"
```

A more complex one:

```yaml
kind: "Datasource"
metadata:
  name: "GreptimeDBMain"
  project: "observability"
spec:
  default: true
  plugin:
    kind: "GreptimeDBDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://greptime.example.com:4000"
          allowedEndpoints:
            - endpointPattern: "/v1/sql"
              method: "POST"
          secret: "greptimedb_secret_config"
```

## GreptimeDBTimeSeriesQuery

Perses supports time series queries for GreptimeDB: `GreptimeDBTimeSeriesQuery`.

```yaml
kind: "GreptimeDBTimeSeriesQuery"
spec:
  # `query` is the SQL expression for time series data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default GreptimeDBDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <GreptimeDB Datasource selector> # Optional
```

- See [GreptimeDB Datasource selector](#greptimedb-datasource-selector)

### Time range variables

Time series queries can use Perses built-in time range variables in the SQL expression: `${__from}` and `${__to}`. They are replaced with the dashboard time picker start and end (Unix milliseconds) when the query runs. You do not need to create these variables manually.

See also [Perses variable syntax](https://perses.dev/perses/docs/concepts/variable/#using-variables).

### Example

A time series query with GreptimeDB range alignment:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "GreptimeDBTimeSeriesQuery"
    spec:
      query: |
        SELECT time_window, loc,
            max(max_temp) RANGE '1m' FILL LINEAR AS max_temp
          FROM public.temp_alerts
          WHERE time_window >= to_timestamp_millis(${__from})
            AND time_window <= to_timestamp_millis(${__to})
          ALIGN '30s' BY (loc)
          ORDER BY time_window ASC
          LIMIT 2000
```

## GreptimeDBLogQuery

Perses supports log queries for GreptimeDB: `GreptimeDBLogQuery`.

```yaml
kind: "GreptimeDBLogQuery"
spec:
  # `query` is the SQL expression for log data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default GreptimeDBDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <GreptimeDB Datasource selector> # Optional
```

- See [GreptimeDB Datasource selector](#greptimedb-datasource-selector)

### Example

A simple log query:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "GreptimeDBLogQuery"
    spec:
      query: "SELECT * FROM greptime.public.logs LIMIT 100"
```

## GreptimeDBTraceQuery

Perses supports trace queries for GreptimeDB: `GreptimeDBTraceQuery`.

```yaml
kind: "GreptimeDBTraceQuery"
spec:
  # `query` is the SQL expression for trace data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default GreptimeDBDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <GreptimeDB Datasource selector> # Optional
```

- See [GreptimeDB Datasource selector](#greptimedb-datasource-selector)

### Example

A simple trace list query:

```yaml
kind: "TraceQuery"
spec:
  plugin:
    kind: "GreptimeDBTraceQuery"
    spec:
      query: "SELECT * FROM public.opentelemetry_traces LIMIT 100"
```

## Shared definitions

### GreptimeDB Datasource selector

!!! note
   See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "GreptimeDBDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
