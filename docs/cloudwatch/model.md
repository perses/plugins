# CloudWatch plugin models

This documentation provides the definition of the different plugins related to Amazon CloudWatch.

## CloudWatchDatasource

The CloudWatch API is reached through the HTTP proxy of the Perses server, which signs the requests with the `sigv4`
configuration of the secret.

```yaml
kind: "CloudWatchDatasource"
spec:
  # It is the http configuration that will be used by the Perses' server to send the queries to the CloudWatch API.
  proxy: <HTTP Proxy specification>
```

### HTTP Proxy specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

- `url` is the URL of the CloudWatch API of a region: `https://monitoring.<region>.amazonaws.com`.
- `secret` is mandatory. It must define a `sigv4` configuration with the service name `monitoring`.
  See the [secret documentation](https://perses.dev/perses/docs/api/secret/#sigv4-specification).
- The plugin sends every query to `POST /`, so that single endpoint is all you need to allow.

### Example

```yaml
kind: "Datasource"
metadata:
  name: "cloudwatch"
  project: "production"
spec:
  default: true
  plugin:
    kind: "CloudWatchDatasource"
    spec:
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "https://monitoring.eu-west-3.amazonaws.com"
          allowedEndpoints:
            - endpointPattern: "^/$"
              method: "POST"
          secret: "cloudwatch-sigv4"
```

## CloudWatchTimeSeriesQuery

```yaml
kind: "CloudWatchTimeSeriesQuery"
spec:
  # `datasource` is a datasource selector. If not provided, the default CloudWatchDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <CloudWatch Datasource selector> # Optional

  # `queries` are sent in a single GetMetricData request, so the expressions can reference the other queries.
  # Between 1 and 20 queries.
  queries:
    - <Query specification>
```

### CloudWatch Datasource selector

```yaml
kind: "CloudWatchDatasource"
# The name of the datasource regardless of its level
name: <string> # Optional
```

### Query specification

A query defines either a `metric` or an `expression`.

```yaml
# `id` identifies the query in the expressions. It starts with a lower-case letter.
id: <string>

# `label` is the legend of the series. It can use variables.
label: <string> # Optional

# `returnData` set to false hides the series, for example when it is only used by an expression.
returnData: <boolean> | default = true # Optional

metric: <Metric specification> # Optional

# `expression` is a metric math expression referencing the other queries by ID, for example "m1 / m2 * 100".
expression: <string> # Optional
```

### Metric specification

```yaml
# The namespace of the metric, for example "AWS/EC2". It can use variables.
namespace: <string>

# The name of the metric, for example "CPUUtilization". It can use variables.
name: <string>

# The dimensions of the metric. The names and values can use variables.
dimensions:
  <string>: <string> # Optional

# The statistic: Average, Sum, Minimum, Maximum, SampleCount, or a percentile from p0 to p100 (for example p99.5).
statistic: <string>

# The minimum period in seconds, a multiple of 60 between 60 and 86400.
# It is increased to the step suggested by the panel, and so the query returns at most 10000 datapoints.
period: <int>
```

### Example

```yaml
kind: "CloudWatchTimeSeriesQuery"
spec:
  datasource:
    kind: "CloudWatchDatasource"
    name: "cloudwatch"
  queries:
    - id: "m1"
      returnData: false
      metric:
        namespace: "AWS/EC2"
        name: "CPUUtilization"
        dimensions:
          InstanceId: "$instance"
        statistic: "Average"
        period: 60
    - id: "e1"
      label: "CPU of $instance (x2)"
      expression: "m1 * 2"
```

## CloudWatchDimensionValuesVariable

```yaml
kind: "CloudWatchDimensionValuesVariable"
spec:
  datasource: <CloudWatch Datasource selector> # Optional

  # The namespace of the metrics, for example "AWS/EC2". It can use variables.
  namespace: <string>

  # Narrows the discovery to a metric. It can use variables.
  metricName: <string> # Optional

  # The dimension whose values are the options of the variable, for example "InstanceId".
  dimensionKey: <string>

  # Narrows the discovery to the metrics with these dimension values. The names and values can use variables.
  dimensions:
    <string>: <string> # Optional
```

### Example

```yaml
kind: "Variable"
metadata:
  name: "instance"
  project: "production"
spec:
  kind: "ListVariable"
  spec:
    plugin:
      kind: "CloudWatchDimensionValuesVariable"
      spec:
        datasource:
          kind: "CloudWatchDatasource"
          name: "cloudwatch"
        namespace: "AWS/EC2"
        metricName: "CPUUtilization"
        dimensionKey: "InstanceId"
        dimensions:
          AutoScalingGroupName: "$asg"
```
