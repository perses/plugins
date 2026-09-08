# Prometheus plugin models

This documentation provides the definition of the different plugins related to Prometheus.

## PrometheusDatasource

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

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

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

## PrometheusTimeSeriesQuery

Perses currently supports only one kind of query for Prometheus: `PrometheusTimeSeriesQuery`. Others will come in the future.

```yaml
kind: "PrometheusTimeSeriesQuery"
spec:
  # `query` is the promQL expression.
  query: <string>

  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Prometheus Datasource selector> # Optional
  seriesNameFormat: <string> # Optional

  # `minStep` is the minimum time interval you want between each data points.
  minStep: <duration> # Optional
  resolution: <number> # Optional
```

- See [Prometheus Datasource selector](#prometheus-datasource-selector)

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

## PrometheusLabelNamesVariable

```yaml
kind: "PrometheusLabelNamesVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Prometheus Datasource selector> # Optional
  matchers:
    - <string> # Optional
```

- See [Prometheus Datasource selector](#prometheus-datasource-selector)

### Example

A simple Prometheus LabelNames variable defined in a project would look like:

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

## PrometheusLabelValuesVariable

```yaml
kind: "PrometheusLabelValuesVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Prometheus Datasource selector> # Optional
  labelName: <string>
  matchers:
    - <string> # Optional
```

- See [Prometheus Datasource selector](#prometheus-datasource-selector)

### Example

A simple Prometheus LabelValues variable defined in the global scope would look like:

```yaml
kind: "GlobalVariable"
metadata:
  name: "job"
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
kind: "GlobalVariable"
metadata:
  name: "instance"
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

## PrometheusPromQLVariable

```yaml
kind: "PrometheusPromQLVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Prometheus Datasource selector> # Optional
  # The promql expression
  expr: <string>
  labelName: <string>
```

- See [Prometheus Datasource selector](#prometheus-datasource-selector)

### Example

A simple Prometheus PromQL variable defined in a dashboard would look like:

```yaml
kind: "ListVariable"
spec:
  name: "job"
  allowMultiple: false
  allowAllValue: false
  plugin:
    kind: "PrometheusPromQLVariable"
    spec:
      expr: "group by (job) (up)",
      labelName: "job"
```

## PrometheusPromQLAnnotation

```yaml
kind: "PrometheusPromQLAnnotation"
spec:
  # `datasource` is a datasource selector. If not provided, the default PrometheusDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Prometheus Datasource selector> # Optional

  # The promql expression, executed as a range query over the time range of the dashboard.
  # Each series returned becomes an annotation, spanning from the timestamp of its first sample
  # to the timestamp of its last one.
  expr: <string>

  # Title displayed in the annotation tooltip.
  # Labels of the series can be interpolated with the `{{label_name}}` syntax.
  title: <string> # Optional

  # Text displayed below the title in the annotation tooltip.
  # Labels of the series can be interpolated with the `{{label_name}}` syntax.
  legend: <string> # Optional

  # Label names to display as tags in the annotation tooltip. All the labels are displayed if not provided.
  tags:
    - <string> # Optional
```

- See [Prometheus Datasource selector](#prometheus-datasource-selector)

### Example

A simple Prometheus PromQL annotation defined in a dashboard would look like:

```yaml
kind: "Dashboard"
metadata:
  name: "MyDashboard"
  project: "perses"
spec:
  annotations:
    - display:
        name: "Deployments"
        color: "#EE6C6C"
      plugin:
        kind: "PrometheusPromQLAnnotation"
        spec:
          expr: "changes(kube_deployment_status_observed_generation{namespace=\"$namespace\"}[5m]) > 0"
          title: "Deployment of {{deployment}}"
          tags:
            - "deployment"
  # ...
```

## Shared definitions

### Prometheus Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "PrometheusDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
