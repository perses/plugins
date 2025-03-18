# Prometheus-related plugins

This documentation provides the definition of the different plugins related to Prometheus.

## Datasource

Prometheus as a datasource is basically an HTTP server. So we need to define an HTTP config.

```yaml
kind: "PrometheusDatasource"
spec:
  # It is the url of the datasource.
  # Leave it empty if you don't want to access the datasource directly from the UI.
  # You should define a proxy if you want to access the datasource through the Perses' server.
  directUrl: <url> # Optional

  # It is the http configuration that will be used by the Perses' server to redirect to the datasource any query sent by the UI.
  proxy: <HTTP Proxy specification> # Optional

  scrapeInterval: <duration> # Optional
```

### HTTP Proxy specification

See [common plugin definitions](https://github.com/perses/perses/blob/main/docs/plugins/common.md#http-proxy-specification).

### Example

A simple Prometheus datasource would be

```yaml
kind: "Datasource"
metadata:
  name: "PrometheusDemo"
  project: "perses"
spec:
  default: true
  plugin:
    kind: "PrometheusDatasource"
    spec:
      directUrl: "https://prometheus.demo.do.prometheus.io"
```

A more complex one:

```yaml
kind: "Datasource"
metadata:
  name: "PrometheusDemo"
  project: "perses"
spec:
  default: true
  plugin:
    kind: "PrometheusDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "https://prometheus.demo.do.prometheus.io"
          allowedEndpoints:
            - endpointPattern: "/api/v1/labels"
              method: "POST"
            - endpointPattern: "/api/v1/series"
              method: "POST"
            - endpointPattern: "/api/v1/metadata"
              method: "GET"
            - endpointPattern: "/api/v1/query"
              method: "POST"
            - endpointPattern: "/api/v1/query_range"
              method: "POST"
            - endpointPattern: "/api/v1/label/([a-zA-Z0-9_-]+)/values"
              method: "GET"
          secret: "prometheus_secret_config"
```

## Query

Perses currently supports only one kind of query for Prometheus: `PrometheusTimeSeriesQuery`. Others will come in the future.

```yaml
kind: "PrometheusTimeSeriesQuery"
spec:
  # `query` is the promQL expression.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Datasource selector> # Optional
  seriesNameFormat: <string> # Optional

  # `minStep` is the minimum time interval you want between each data points.
  minStep: <duration> # Optional
  resolution: <number> # Optional
```

### Prometheus Datasource selector

See [Prometheus Datasource selector](#prometheus-datasource-selector-4)

#### Example

A simple one:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "PrometheusTimeSeriesQuery"
    spec:
      query: "rate(caddy_http_response_duration_seconds_sum[$interval])"
```

## Variable

### PrometheusLabelNamesVariable

```yaml
kind: "PrometheusLabelNamesVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Datasource selector> # Optional
  matchers:
    - <string> # Optional
```

#### Prometheus Datasource selector

See [Prometheus Datasource selector](#prometheus-datasource-selector-4)

### Example

A simple Prometheus LabelNames variable would be

```yaml
kind: "Variable"
metadata:
  name: "labelNames"
  project: "perses"
spec:
  kind: "ListVariable"
  spec:
    plugin:
      kind: "PrometheusLabelNamesVariable"
```

A more complex one

```yaml
kind: "Variable"
metadata:
  name: "labelNames"
  project: "perses"
spec:
  kind: "ListVariable"
  spec:
    allowMultiple: false
    allowAllValue: false
    plugin:
      kind: "PrometheusLabelNamesVariable"
      spec:
        datasource:
          kind: "PrometheusDatasource"
          name: "PrometheusDemo"
        matchers:
          - "up"
```

### PrometheusLabelValuesVariable

```yaml
kind: "PrometheusLabelValuesVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Datasource selector> # Optional
  labelName: <string>
  matchers:
    - <string> # Optional
```

#### Prometheus Datasource selector

See [Prometheus Datasource selector](#prometheus-datasource-selector-4)

### Example

A simple Prometheus LabelValues variable would be

```yaml
kind: "Variable"
metadata:
  name: "job"
  project: "perses"
spec:
  kind: "ListVariable"
  spec:
    allowMultiple: false
    allowAllValue: false
    plugin:
      kind: "PrometheusLabelValuesVariable"
      spec:
        labelName: "job"
```

A more complex one

```yaml
kind: "Variable"
metadata:
  name: "instance"
  project: "perses"
spec:
  kind: "ListVariable"
  spec:
    allowMultiple: false
    allowAllValue: false
    plugin:
      kind: "PrometheusLabelValuesVariable"
      spec:
        datasource:
          kind: "PrometheusDatasource"
          name: "PrometheusDemo"
        labelName: "instance"
        matchers:
        - "up{job=~\"$job\"}"
```

### PrometheusPromQLVariable

```yaml
kind: "PrometheusPromQLVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Prometheus Datasource selector> # Optional
  # The promql expression
  expr: <string>
  labelName: <string> # Optional
```

#### Prometheus Datasource selector

See [Prometheus Datasource selector](#prometheus-datasource-selector-4)

## Shared definitions

### Prometheus Datasource selector

!!! note
	See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "PrometheusDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
