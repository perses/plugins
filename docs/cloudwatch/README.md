---
tags:
  - datasource
  - variable
---
# CloudWatch plugins

The CloudWatch plugin package provides support for [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) metrics in
Perses dashboards: a datasource, a time series query with metric math, and a variable listing the values of a dimension.

## Datasource (`CloudWatchDatasource`)

The CloudWatch API requires every request to be signed with the
[AWS Signature Version 4](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html). The datasource therefore
uses the [proxy](https://perses.dev/perses/docs/concepts/proxy/) of the Perses server with a secret holding a `sigv4`
configuration: the server signs the requests, and the browser never receives AWS credentials. A direct URL is not
supported.

All the requests are sent to a single endpoint, `POST /` on `https://monitoring.<region>.amazonaws.com`, so that is the
only endpoint you need to allow.

### Setup

1. Create a secret with a `sigv4` configuration. The service name of CloudWatch is `monitoring`:

   ```yaml
   kind: Secret
   metadata:
     name: cloudwatch-sigv4
     project: production
   spec:
     sigv4:
       region: eu-west-3
       serviceName: monitoring
       accessKey: AKIAIOSFODNN7EXAMPLE
       secretKey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
       # Optional: a role to assume, and its external ID.
       roleArn: arn:aws:iam::123456789012:role/perses-cloudwatch-read
   ```

   Without `accessKey`, the Perses server signs the requests with its own AWS identity (for example the role of its
   Kubernetes service account). This must be enabled by the administrator of the Perses server with
   `datasource.proxy.http.sigv4.allow_default_credentials`.

2. Create the datasource, referencing the secret. The datasource editor builds the URL from the region.

The AWS identity only needs the `cloudwatch:GetMetricData` and `cloudwatch:ListMetrics` permissions.

See also technical docs related to this plugin:

- [Data model](./model.md#cloudwatchdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Time Series Query (`CloudWatchTimeSeriesQuery`)

The CloudWatch time series query sends its queries in a single `GetMetricData` request. A query is either a metric (a
namespace, a metric name, dimensions, a statistic and a period) or a
[metric math expression](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html)
referencing the other queries by ID. Set `returnData` to `false` to hide the series only used by an expression.

The query editor includes a metric discovery: enter a namespace (and optionally a metric name) to list the metrics of
your account, and click one to add it as a query.

See also technical docs related to this plugin:

- [Data model](./model.md#cloudwatchtimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/time-series-query.md)

### Period

The period of a metric is a minimum, like the minimum step of a Prometheus query. It is increased:

- to the step suggested by the panel, as more datapoints than pixels are not useful,
- so all the series of the query stay under 10000 datapoints. For example, a single metric over 7 days is queried with
  a period of at least 2 minutes.

The period is always a multiple of 60 seconds.

### Variables

Dashboard variables can be used in the namespaces, metric names, dimension names and values, expressions and legends.
A dimension takes a single value, so use single-value variables in the dimensions: a multi-value variable is replaced
by a single string, by default in the `(a|b)` format.

## Dimension Values Variable (`CloudWatchDimensionValuesVariable`)

The CloudWatch dimension values variable lists the values of a dimension in a namespace, for example every
`InstanceId` of `AWS/EC2`. The discovery can be narrowed with a metric name and with the values of other dimensions,
which can use other variables.

The values come from `ListMetrics`, which only returns the metrics with data in the last two weeks. At most 1000 metrics
are discovered: use the filters on large accounts.

See also technical docs related to this plugin:

- [Data model](./model.md#cloudwatchdimensionvaluesvariable)
- [Dashboard-as-Code Go lib](./go-sdk/dimension-values-variable.md)
