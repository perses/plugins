# Prometheus plugins

The Prometheus package includes several plugins that provide comprehensive support for Prometheus in Perses.

## Datasource (`PrometheusDatasource`)

The Prometheus data source is the base building block that enables the connection between Perses and your Prometheus instance (or any Prometheus-compatible backend like Thanos for instance). It works in conjunction with the other plugins from this package.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#datasource)
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
- [Data model](./model.md#query)
- [Dashboard-as-Code Go lib](./go-sdk/query.md)

## Explore (`PrometheusExplorer`)

The Prometheus package comes also with a built-in metrics explorer that mirror Prometheus's native UI experience.
