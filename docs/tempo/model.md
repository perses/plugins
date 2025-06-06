# Tempo-related plugins

This documentation provides the definition of the different plugins related to Tempo.

## Datasource

```yaml
kind: "TempoDatasource"
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

## Query

Perses currently supports only one kind of query for Tempo: `TempoTraceQuery`. Others may come in the future.

```yaml
kind: "TempoTraceQuery"
spec:
  # `query` is the TraceQL expression.
  query: <string>
  # `datasource` is a datasource selector. If not provided, the default TempoDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Tempo Datasource selector> # Optional
```

### Tempo Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "TempoDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
