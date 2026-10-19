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

### Migrating variables from Grafana

The [migration from Grafana](https://perses.dev/perses/docs/migration/#variables-with-a-regex) doesn't keep the regex of a Grafana variable. This section explains how it migrates the Prometheus query variables, and how to get the same values as in Grafana.

In Grafana, a Prometheus query variable hides the Prometheus API. For example, `query_result(<expr>)` returns each series as a line of text, such as `up{instance="demo:9100",job="node"} 1 1700000000000`, and the regex often extracts a label value from these lines. The Prometheus variables of Perses don't hide the Prometheus API: they list label names, or the values of the label set in their `Label Name` field, which is mandatory.

#### How Prometheus query variables are migrated

The migration converts the Grafana query as follows:

- `label_names()` becomes a `PrometheusLabelNamesVariable`.
- `label_values(<label>)` and `label_values(<series selector>, <label>)` become a `PrometheusLabelValuesVariable`, with `<label>` as `Label Name` and `<series selector>`, if any, as `Series Selector`.
- `query_result(<expr>)` becomes a `PrometheusPromQLVariable` that runs `<expr>`, with a label of a `by (...)` clause of `<expr>` as `Label Name`: check it, especially when `<expr>` groups by several labels or has several `by (...)` clauses. If no label is found this way, for example when there is no `by (...)` clause, the query keeps the `query_result(...)` wrapper and the `Label Name` is `migration_from_grafana_not_supported`: remove the wrapper and set the `Label Name` yourself.
- Any other query, such as `metrics(<regex>)`, `label_names(<regex>)` or a series selector, becomes the static variable shown in [Using the CLI](https://perses.dev/perses/docs/migration/#using-the-cli). To replace it when the query was a series selector, such as `up{job="node"}`, use a `PrometheusLabelValuesVariable` with this selector as `Series Selector` and, as `Label Name`, the label whose value the regex extracted, such as `instance` for `/instance="([^"]+)"/`. When the query was `metrics(<regex>)`, use a `PrometheusLabelValuesVariable` with `__name__` as `Label Name`, and filter the metric names as explained below.

The queries are matched as written, so extra spaces, `BY` in capitals or a label name with a dot can lead to `migration_from_grafana_not_supported` or to the static variable: check each migrated variable.

#### How to get the same values as in Grafana

- If the regex only extracted the value of a label from the lines of `query_result(<expr>)`, such as `/instance="([^"]+)"/`, set the `Label Name` to this label: you don't need a regex anymore. The metric name, at the start of a line, is the value of the label `__name__`.
- If the regex extracted the sample value, the first number after the labels, as `/.* ([^\ ]*) .*/` does, no label holds it: use `count_values("value", <expr>)` as the query, and `value` as the `Label Name`. `count_values` returns one series for each distinct value of `<expr>`, with this value in its label `value`. If `<expr>` returns a scalar, which Grafana lists as a single value, use `count_values("value", vector(<expr>))`.
- To keep only some values of the `Label Name`, add a matcher on this label to the query or to the `Series Selector`, such as `kube_pod_info{namespace=~"prod-.*"}` instead of `kube_pod_info` when the `Label Name` is `namespace`. Prometheus then keeps only the series whose label matches the [regular expression](https://prometheus.io/docs/prometheus/latest/querying/basics/#regular-expressions) of the matcher.
    - The regular expression uses the RE2 syntax, must match the whole label value, and can start with `(?i)` to ignore the case.
    - RE2 doesn't support lookarounds such as `(?!...)`: to exclude values, use a negative matcher instead, such as `kube_pod_info{namespace!~"kube-.*"}`. Without a metric name, a selector needs a matcher that doesn't match an empty value, so Prometheus rejects `{namespace!~"kube-.*"}`: write `{namespace=~".+",namespace!~"kube-.*"}` instead.
    - Put the matcher in the existing `Series Selector`, if there is one: a second `Series Selector` can only add values, because Prometheus lists the values of each one and merges them.
    - A matcher selects series: on a `PrometheusLabelNamesVariable`, it keeps the names of the selected series, but it can't keep only the names that match a regex.
- Otherwise, or to filter label names, set the [Capturing Regexp Filter](https://perses.dev/perses/docs/migration/#using-the-capturing-regexp-filter) of the variable. Unlike a matcher, it doesn't replace variables such as `$env`.

#### Example

A Grafana variable with the query `query_result(group by (ifAlias) (ifHCInOctets))` and the regex `.*ifAlias="Prov: ([^,]+),.*` gets `ACME` from the line `{ifAlias="Prov: ACME, 10G"} 1 1700000000000`. The migrated variable lists the values of the `ifAlias` label instead, such as `Prov: ACME, 10G`. To use `ACME` in the queries again, keep only the part of the regex that matches the start of the label value, `Prov: ([^,]+),`, and anchor it with `^`:

```yaml
kind: ListVariable
spec:
  name: provider
  capturingRegexp: "^Prov: ([^,]+),"
  plugin:
    kind: PrometheusPromQLVariable
    spec:
      expr: group by (ifAlias) (ifHCInOctets)
      labelName: ifAlias
```

With this filter, the dropdown still shows `Prov: ACME, 10G`, while the value of the variable, used in the queries, is `ACME`.

### Built-in Variables

The Prometheus package provide several built-in variables that can be used within your PromQL queries:

- **`$__interval`**: Current dashboard interval. For dynamic queries that adapt across different time ranges, use `$__interval` instead of hardcoded intervals. It represents the actual spacing between data points: it’s calculated based on the current time range and the panel pixel width (taking the "Min step" as a lower bound).
- **`__interval_ms`**: Same as `$__interval` but in milliseconds.
- **`$__rate_interval`**: Use this one rather than `$__interval` as the range parameter of promQL functions like `rate()`, `increase()`, etc. With such function it is advised to choose a range that is at least 4x the scrape interval (this is to allow for various races, and to be resilient to a failed scrape). `$__rate_interval` provides that, as it is defined as `max($__interval + Min Step, 4 * Min Step)`, where the Min Step value should represent the scrape interval of the metrics.

These variables are computed from the step of the query, whose lower bound is the Min Step, so they cannot be used to set the Min Step itself.

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

[Exemplars](https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars) are references to related data — typically a trace ID — attached to individual samples of a metric. They let you go from an aggregate metric to a concrete representative request, which is handy to investigate a spike or a latency outlier directly from a dashboard.

The Prometheus package supports displaying exemplars on the [Time Series Chart](../timeserieschart/README.md) panel:

- When exemplars are enabled on the datasource (see below), the `PrometheusTimeSeriesQuery` plugin calls the Prometheus [`/api/v1/query_exemplars`](https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars) endpoint in parallel with every range query, and attaches the returned exemplars to the series matching their labels.
- On the chart, each exemplar is rendered as a diamond marker placed at its value and timestamp, using the color of the series it belongs to. Clicking a marker opens a dialog with its metadata: the labels of the series it belongs to, the exemplar labels (like `trace_id`), its value and its timestamp (e.g. to copy a trace ID and open the corresponding trace in your tracing UI).
- A failed exemplars request never impacts the panel itself: the query results are displayed without exemplars.

### Enabling exemplars

Exemplars are opt-in and configured at the datasource level. You can either toggle the **Enable exemplars** switch in the Prometheus datasource editor, or set the following in the datasource spec:

```yaml
kind: "PrometheusDatasource"
spec:
  exemplars:
    enable: true
```

When using the Dashboard-as-Code Go lib, the same can be achieved with the `datasource.EnableExemplars()` option (see [Go SDK](./go-sdk/datasource.md#exemplars)).

Some requirements and caveats to be aware of:

- The Prometheus instance (or any Prometheus-compatible backend) must have the [exemplar storage](https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplars-storage) enabled, and your telemetry pipeline must actually attach exemplars to the samples (e.g. via the OTLP receiver).
- Exemplars are only fetched for range queries: queries executed in instant mode never display exemplars.
- When relying on the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature, make sure the `/api/v1/query_exemplars` endpoint is allowed so exemplars can be fetched through the Perses server.

## Annotation (`PrometheusPromQLAnnotation`)

The annotation plugin overlays contextual events on the panels of a dashboard, like deployments, incidents or maintenance windows. The provided PromQL expression is executed as a range query over the time range of the dashboard, and each series it returns becomes an annotation spanning from the timestamp of its first sample to the timestamp of its last one.

The `title` and `legend` displayed in the annotation tooltip can be built from the labels of the series, using the `{{label_name}}` syntax (e.g `Deployment {{service}}`). The labels shown as tags can be restricted with `tags`, all of them being displayed otherwise.

See also technical docs related to this plugin:
- [Data model](./model.md#prometheuspromqlannotation)

## Explore (`PrometheusExplorer`)

The Prometheus package comes also with a built-in metrics explorer that mirror Prometheus's native UI experience.
