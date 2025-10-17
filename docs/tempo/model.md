# Tempo plugins data model

This document describes the data models used by Tempo plugins in Perses.

## TempoDatasource

The `TempoDatasource` plugin provides configuration for connecting to Grafana Tempo distributed tracing instances.

### YAML Specification

```yaml
kind: "TempoDatasource"
spec:
  # Direct URL to the Tempo instance
  # Leave empty if accessing through proxy only
  directUrl: <url> # Optional

  # HTTP proxy configuration for accessing Tempo through Perses server
  proxy: <HTTP Proxy specification> # Optional
```

### HTTP Proxy specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

### Example

```yaml
apiVersion: v1
kind: Datasource
metadata:
  name: tempo-production
  project: observability
spec:
  default: false
  plugin:
    kind: TempoDatasource
    spec:
      directUrl: "http://tempo.example.com:3200"
```

## TempoTraceQuery

Perses currently supports one kind of query for Tempo: `TempoTraceQuery`. Others may come in the future.

```yaml
kind: "TempoTraceQuery"
spec:
  # TraceQL expression for querying traces
  query: <string>
  
  # Optional datasource selector. If not provided, the default TempoDatasource is used
  # See the documentation about datasources to understand selection
  datasource: <Tempo Datasource selector> # Optional
```

### Example

```yaml
kind: TempoTraceQuery
spec:
  query: '{service.name="frontend"} | duration > 100ms'
  datasource:
    kind: TempoDatasource
    name: tempo-production
```

This query searches for traces from the "frontend" service with duration greater than 100ms using TraceQL syntax.

## Tempo Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "TempoDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
