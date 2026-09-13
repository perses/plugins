---
tags:
  - datasource
---
# Prometheus plugins

The Prometheus package includes several plugins that provide comprehensive support for Prometheus in Perses.

## Datasource (`PrometheusDatasource`)

The Prometheus data source is the base building block that enables the connection between Perses and your Prometheus instance (or any Prometheus-compatible backend like Thanos for instance). It works in conjunction with the other plugins from this package.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

It also provides an opt-in support for [exemplars](#exemplars).

See also technical docs related to this plugin:

- [Data model](./model.md#prometheusdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Variables

the Prometheus plugin provides powerful templating capabilities for Prometheus data sources. Instead of hard-coding details such as server, application, and sensor names in metric queries, you can use variables that are displayed as dropdown select boxes at the top of the dashboard to dynamically change the displayed data.

### Available Variable Plugins

Perses offers three specialized variable plugins for Prometheus:

#### Label Values (`PrometheusLabelValuesVariable`)

Returns a list of label values for a specific label across all metrics or within a specific metric. This plugin relies on the Prometheus `/api/v1/label/{label}/values` API endpoint. You can use it e.g to filter dashboards by environment, region, or service.

See also technical docs related to this plugin:

- [Data model](./model.md#prometheuslabelvaluesvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable/label-values.md)
- [Dashboard-as-Code CUE lib](./cue-sdk/variable/label-values.md)

#### Label Names (`PrometheusLabelNamesVariable`)

Returns a list of all available label names, optionally filtered by a metric regex. This plugin relies on the Prometheus `/api/v1/labels` API endpoint. You can use it e.g to discover available labels for exploration or build dynamic queries based on available dimensions.

See also technical docs related to this plugin:

- [Data model](./model.md#prometheuslabelnamesvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable/label-names.md)
- [Dashboard-as-Code CUE lib](./cue-sdk/variable/label-names.md)

#### PromQL (`PrometheusPromQLVariable`)

Executes the provided PromQL query and returns the results. This plugin relies on the Prometheus `/api/v1/query` API endpoint. You can use it e.g to create variables based on complex query results or generate dynamic lists using functions like `topk()` or `max_over_time()`.

See also technical docs related to this plugin:

- [Data model](./model.md#prometheuspromqlvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable/promql.md)
- [Dashboard-as-Code CUE lib](./cue-sdk/variable/promql.md)

### Built-in Variables

The Prometheus package provide several built-in variables that can be used within your PromQL queries:

- **`$__interval`**: Current dashboard interval. For dynamic queries that adapt across different time ranges, use `$__interval` instead of hardcoded intervals. It represents the actual spacing between data points: it’s calculated based on the current time range and the panel pixel width (taking the "Min step" as a lower bound).
- **`__interval_ms`**: Same as `$__interval` but in milliseconds.
- **`$__rate_interval`**: Use this one rather than `$__interval` as the range parameter of promQL functions like `rate()`, `increase()`, etc. With such function it is advised to choose a range that is at least 4x the scrape interval (this is to allow for various races, and to be resilient to a failed scrape). `$__rate_interval` provides that, as it is defined as `max($__interval + Min Step, 4 * Min Step)`, where the Min Step value should represent the scrape interval of the metrics.

### Variable Syntax

The syntax to use is the [standard variable syntax of Perses](https://perses.dev/perses/docs/concepts/variable/#using-variables).

!!! warning
    When using multi-value variables, ensure you use the regex operator `=~` instead of exact match `=` since Perses automatically converts multiple values to regex-compatible strings.

## Time series query (`PrometheusTimeSeriesQuery`)

The Time series query plugin to be used in panels compatible with metrics display. It comes with neat features like auto-completion and a PromQL debugger that mirror Prometheus's native UI experience.

See also technical docs related to this plugin:
- [Data model](./model.md#prometheustimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/query.md)

## Exemplars

[Exemplars](https://prometheus.io/docs/concepts/exemplars/) are references to related data — typically a trace ID — attached to individual samples of a metric. They let you go from an aggregate metric to a concrete representative request, which is handy to investigate a spike or a latency outlier directly from a dashboard.

The Prometheus package supports displaying exemplars on the [Time Series Chart](../timeserieschart/README.md) panel:

- When exemplars are enabled on the datasource (see below), the `PrometheusTimeSeriesQuery` plugin calls the Prometheus [`/api/v1/query_exemplars`](https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars) endpoint in parallel with every range query, and attaches the returned exemplars to the series matching their labels.
- On the chart, each exemplar is rendered as a diamond marker placed at its value and timestamp, using the color of the series it belongs to. Hovering a marker displays its labels (like `trace_id`) along with its value and timestamp, and clicking it pins the tooltip so you can inspect the labels at ease (e.g. to copy a trace ID and open the corresponding trace in your tracing UI).
- A failed exemplars request never impacts the panel itself: the query results are displayed without exemplars.

### Enabling exemplars

Exemplars are opt-in and configured at the datasource level. You can either toggle the **Enable exemplars** switch in the Prometheus datasource editor, or set the following in the datasource spec:

```yaml
kind: "PrometheusDatasource"
spec:
  exemplars:
    enable: true
```

Some requirements and caveats to be aware of:

- The Prometheus instance (or any Prometheus-compatible backend) must have the [exemplar storage](https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplar-storage) enabled, and your telemetry pipeline must actually attach exemplars to the samples (e.g. via the OTLP receiver).
- Exemplars are only fetched for range queries: queries executed in instant mode never display exemplars.
- When relying on the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature, make sure the `/api/v1/query_exemplars` endpoint is allowed so exemplars can be fetched through the Perses server.

## Annotation (`PrometheusPromQLAnnotation`)

The annotation plugin overlays contextual events on the panels of a dashboard, like deployments, incidents or maintenance windows. The provided PromQL expression is executed as a range query over the time range of the dashboard, and each series it returns becomes an annotation spanning from the timestamp of its first sample to the timestamp of its last one.

The `title` and `legend` displayed in the annotation tooltip can be built from the labels of the series, using the `{{label_name}}` syntax (e.g `Deployment {{service}}`). The labels shown as tags can be restricted with `tags`, all of them being displayed otherwise.

See also technical docs related to this plugin:
- [Data model](./model.md#prometheuspromqlannotation)

## Explore (`PrometheusExplorer`)

The Prometheus package comes also with a built-in metrics explorer that mirror Prometheus's native UI experience.
