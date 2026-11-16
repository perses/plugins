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
          headers:
            X-Trino-User: "perses"
          secret: "trino_secret_config"
```

## TrinoTimeSeriesQuery

Perses supports time series queries for Trino: `TrinoTimeSeriesQuery`.

```yaml
kind: "TrinoTimeSeriesQuery"
spec:
  # `query` is the SQL expression. It must return a `time` column; number-typed columns are values and every other column
  # is a label that splits the result into series.
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

All string fields accept dashboard variables.

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

## Shared definitions

### Trino Datasource selector

!!! note
See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "TrinoDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
