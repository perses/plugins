# OpenSearch plugin models

This documentation provides the definition of the different plugins related to OpenSearch.

## OpenSearchDatasource

OpenSearch as a datasource is basically an HTTP server. So we need to define an HTTP config.

```yaml
kind: "OpenSearchDatasource"
spec:
  # It is the url of the datasource.
  # Leave it empty if you don't want to access the datasource directly from the UI.
  # You should define a proxy if you want to access the datasource through the Perses' server.
  directUrl: <url> # Optional

  # It is the http configuration that will be used by the Perses' server to redirect to the datasource any query sent by the UI.
  proxy: <HTTP Proxy specification> # Optional
```

!!! warning
    Exactly one of `directUrl` or `proxy` must be set. Providing neither, or both, is rejected.

### HTTP Proxy specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

The plugin sends every query to `POST /_plugins/_ppl`, so that single endpoint is all you need to allow.

### Example

A simple OpenSearch datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "OpenSearchMain"
  project: "logging"
spec:
  default: true
  plugin:
    kind: "OpenSearchDatasource"
    spec:
      directUrl: "http://opensearch.example.com:9200"
```

A more complex one:

```yaml
kind: "Datasource"
metadata:
  name: "OpenSearchMain"
  project: "logging"
spec:
  default: true
  plugin:
    kind: "OpenSearchDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://opensearch.example.com:9200"
          allowedEndpoints:
            - endpointPattern: "/_plugins/_ppl"
              method: "POST"
          secret: "opensearch_secret_config"
```

## OpenSearchLogQuery

Perses supports log queries for OpenSearch: `OpenSearchLogQuery`.

```yaml
kind: "OpenSearchLogQuery"
spec:
  # `query` is the PPL expression for log data. It cannot be empty.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default OpenSearchDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <OpenSearch Datasource selector> # Optional

  # `index` is the index or index pattern to read from, e.g. `logs-*`.
  # It is prepended to the query as a `source=<index>` clause, and ignored when the
  # query already starts with `source=`.
  index: <string> # Optional

  # `timestampField` overrides which column carries the log timestamp.
  # It is also the column used by the automatic time filter.
  # Defaults to `@timestamp`, then `timestamp`, then `time`.
  timestampField: <string> # Optional

  # `messageField` overrides which column becomes the log line.
  # Defaults to `message`, then `log`, then `body`.
  messageField: <string> # Optional

  # When `disableTimeFilter` is true, the panel time range is NOT injected as a
  # `where` clause on the timestamp field.
  disableTimeFilter: <boolean> # Optional
```

- See [OpenSearch Datasource selector](#opensearch-datasource-selector)

### Example

A simple log query:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "OpenSearchLogQuery"
    spec:
      index: "otel-logs-*"
      query: "where severityText='ERROR'"
```

A more complex one, reading from an index whose fields do not match the defaults, and managing its own time bounds:

```yaml
kind: "LogQuery"
spec:
  plugin:
    kind: "OpenSearchLogQuery"
    spec:
      datasource:
        kind: "OpenSearchDatasource"
        name: "OpenSearchMain"
      query: "source=app-logs-* | where `service.name`='payment-svc' | sort - time | head 100"
      timestampField: "time"
      messageField: "msg"
      disableTimeFilter: true
```

## Shared definitions

### OpenSearch Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "OpenSearchDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
