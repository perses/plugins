# VictoriaLogs plugin models

This documentation provides the definition of the different plugins related to VictoriaLogs.

## VictoriaLogsDatasource

VictoriaLogs as a datasource is basically an HTTP server. So we need to define an HTTP config.

```yaml
kind: "VictoriaLogsDatasource"
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

A simple VictoriaLogs datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "VictoriaLogsMain"
  project: "logging"
spec:
  default: true
  plugin:
    kind: "VictoriaLogsDatasource"
    spec:
      directUrl: "http://victorialogs.example.com:9428"
```

A more complex one:

```yaml
kind: "Datasource"
metadata:
  name: "VictoriaLogsMain"
  project: "logging"
spec:
  default: true
  plugin:
    kind: "VictoriaLogsDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://victorialogs.example.com:9428"
          allowedEndpoints:
            - endpointPattern: "/select/logsql/query"
              method: "GET"
            - endpointPattern: "/select/logsql/field_names"
              method: "GET"
            - endpointPattern: "/select/logsql/field_values"
              method: "GET"
          secret: "victorialogs_secret_config"
```

## VictoriaLogsTimeSeriesQuery

Perses supports time series queries for VictoriaLogs: `VictoriaLogsTimeSeriesQuery`.

```yaml
kind: "VictoriaLogsTimeSeriesQuery"
spec:
  # `query` is the LogsQL expression for time series data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default VictoriaLogsDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <VictoriaLogs Datasource selector> # Optional
```

- See [VictoriaLogs Datasource selector](#victorialogs-datasource-selector)

### Example

A simple time series query:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "VictoriaLogsTimeSeriesQuery"
    spec:
      query: '_stream:{job="nginx"} | stats count() by (_time:1m)'
```

## VictoriaLogsLogQuery

Perses supports log queries for VictoriaLogs: `VictoriaLogsLogQuery`.

```yaml
kind: "VictoriaLogsLogQuery"
spec:
  # `query` is the LogsQL expression for log data.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default VictoriaLogsDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <VictoriaLogs Datasource selector> # Optional
```

- See [VictoriaLogs Datasource selector](#victorialogs-datasource-selector)

### Example

A simple log query:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "VictoriaLogsLogQuery"
    spec:
      query: '_stream:{job="nginx"} AND error'
```

## VictoriaLogsFieldValuesVariable

```yaml
kind: "VictoriaLogsFieldValuesVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default VictoriaLogsDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <VictoriaLogs Datasource selector> # Optional

  # The field name to extract values from
  fieldName: <string>

  # Optional LogsQL query to filter the results
  query: <string> # Optional
```

- See [VictoriaLogs Datasource selector](#victorialogs-datasource-selector)

### Example

A simple VictoriaLogs field values variable defined in a project would look like:

```yaml
kind: "Variable"
metadata:
  name: "job"
  project: "logging"
spec:
  kind: "ListVariable"
  spec:
    plugin:
      kind: "VictoriaLogsFieldValuesVariable"
      spec:
        fieldName: "job"
```

A more complex one:

```yaml
kind: "Variable"
metadata:
  name: "service"
  project: "logging"
spec:
  kind: "ListVariable"
  spec:
    allowMultiple: false
    allowAllValue: false
    plugin:
      kind: "VictoriaLogsFieldValuesVariable"
      spec:
        datasource:
          kind: "VictoriaLogsDatasource"
          name: "VictoriaLogsMain"
        fieldName: "service"
        query: '_stream:{environment="production"}'
```

## VictoriaLogsFieldNamesVariable

```yaml
kind: "VictoriaLogsFieldNamesVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default VictoriaLogsDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <VictoriaLogs Datasource selector> # Optional

  # Optional LogsQL query to filter the results
  query: <string> # Optional
```

- See [VictoriaLogs Datasource selector](#victorialogs-datasource-selector)

### Example

A simple VictoriaLogs field names variable defined in a project would look like:

```yaml
kind: "Variable"
metadata:
  name: "available_fields"
  project: "logging"
spec:
  kind: "ListVariable"
  spec:
    plugin:
      kind: "VictoriaLogsFieldNamesVariable"
```

## Shared definitions

### VictoriaLogs Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "VictoriaLogsDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
