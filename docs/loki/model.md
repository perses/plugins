# Loki plugin models

This documentation provides the definition of the different plugins related to Loki.

## LokiDatasource

Loki as a datasource is basically an HTTP server. So we need to define an HTTP config.

```yaml
kind: "LokiDatasource"
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

A simple Loki datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "LokiMain"
  project: "logging"
spec:
  default: true
  plugin:
    kind: "LokiDatasource"
    spec:
      directUrl: "http://loki.example.com:3100"
```

A more complex one:

```yaml
kind: "Datasource"
metadata:
  name: "LokiMain"
  project: "logging"
spec:
  default: true
  plugin:
    kind: "LokiDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://loki.example.com:3100"
          allowedEndpoints:
            - endpointPattern: "/loki/api/v1/query"
              method: "GET"
            - endpointPattern: "/loki/api/v1/query_range"
              method: "GET"
            - endpointPattern: "/loki/api/v1/labels"
              method: "GET"
            - endpointPattern: "/loki/api/v1/label/([a-zA-Z0-9_-]+)/values"
              method: "GET"
          secret: "loki_secret_config"
```

## LokiTimeSeriesQuery

Perses supports time series queries for Loki: `LokiTimeSeriesQuery`.

```yaml
kind: "LokiTimeSeriesQuery"
spec:
  # `query` is the LogQL expression for time series data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default LokiDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Loki Datasource selector> # Optional

  # The output format for the query results
  format: <string> # Optional
```

- See [Loki Datasource selector](#loki-datasource-selector)

## LokiLogQuery

Perses supports log queries for Loki: `LokiLogQuery`.

```yaml
kind: "LokiLogQuery"
spec:
  # `query` is the LogQL expression for log data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default LokiDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Loki Datasource selector> # Optional

  # The output format for the query results
  format: <string> # Optional
```

- See [Loki Datasource selector](#loki-datasource-selector)

### Examples

A simple log query:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "LokiLogQuery"
    spec:
      query: '{job="nginx"} |= "error"'
```

A time series query:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "LokiTimeSeriesQuery"
    spec:
      query: 'rate({job="nginx"}[5m])'
```

## Shared definitions

### Loki Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "LokiDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
