# Pyroscope plugin models

This documentation provides the definition of the different plugins related to Pyroscope.

## PyroscopeDatasource

Pyroscope as a datasource is basically an HTTP server. So we need to define an HTTP config.

```yaml
kind: "PyroscopeDatasource"
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

A simple Pyroscope datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "PyroscopeMain"
  project: "profiling"
spec:
  default: true
  plugin:
    kind: "PyroscopeDatasource"
    spec:
      directUrl: "http://pyroscope.example.com:4040"
```

A more complex one:

```yaml
kind: "Datasource"
metadata:
  name: "PyroscopeMain"
  project: "profiling"
spec:
  default: true
  plugin:
    kind: "PyroscopeDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "http://pyroscope.example.com:4040"
          allowedEndpoints:
            - endpointPattern: "/render"
              method: "GET"
            - endpointPattern: "/labels"
              method: "GET"
            - endpointPattern: "/label-values"
              method: "GET"
          secret: "pyroscope_secret_config"
```

## PyroscopeProfileQuery

Perses supports profile queries for Pyroscope: `PyroscopeProfileQuery`.

```yaml
kind: "PyroscopeProfileQuery"
spec:
  # Profile type to query (e.g., "cpu", "memory", "goroutines")
  profileType: <string>

  # `query` is the query expression using label selectors.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default PyroscopeDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Pyroscope Datasource selector> # Optional
```

- See [Pyroscope Datasource selector](#pyroscope-datasource-selector)

### Example

A simple profile query:

```yaml
kind: "ProfileQuery"
spec:
  plugin:
    kind: "PyroscopeProfileQuery"
    spec:
      profileType: "cpu"
      query: '{service_name="api", environment="production"}'
```

## Shared definitions

### Pyroscope Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "PyroscopeDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
