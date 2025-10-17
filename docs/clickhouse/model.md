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

## Shared definitions

### ClickHouse Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "ClickHouseDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
