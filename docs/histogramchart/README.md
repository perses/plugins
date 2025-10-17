# Histogram Chart

The Histogram Chart plugin displays data as histograms in Perses dashboards. This panel plugin is useful for showing data distribution and frequency analysis.

This plugin allows you to visualize Prometheus Native Histograms, providing a clear and concise way to understand the distribution of your histogram buckets.

!!! warning
This panel plugin is only compatible with Prometheus native histograms data for the moment.

This panel is supporting thresholds, which allow you to colorize the chart based on specific values, making it easier to understand your data.

This chart is also used in TimeSeriesTable plugin to display histogram details, allowing the Explore page to display histograms.

See also technical docs related to this plugin:

- [Data model](./model.md)
- [Dashboard-as-Code Go lib](./go-sdk.md)
