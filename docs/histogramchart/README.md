# Histogram Chart

The Histogram Chart plugin displays data as histograms in Perses dashboards. This panel plugin is useful for showing data distribution and frequency analysis.

This plugin allows you to visualize Prometheus Native Histograms, providing a clear and concise way to understand the distribution of your histogram buckets.

![img.png](https://github.com/perses/website/blob/main/docs/assets/images/blog/v051/histogram-panel.png?raw=true)

!!! warning
    This panel plugin is only compatible with Prometheus native histograms data for the moment.

This panel is supporting thresholds, which allow you to colorize the chart based on specific values, making it easier to understand your data.

![img.png](https://github.com/perses/website/blob/main/docs/assets/images/blog/v051/histogram-thresholds.png?raw=true)

This chart is also used in TimeSeriesTable plugin to display histogram details, allowing the Explore page to display histograms.

![img.png](https://github.com/perses/website/blob/main/docs/assets/images/blog/v051/histogram-explore.png?raw=true)

See also technical docs related to this plugin:

- [Data model](./model.md)
- [Dashboard-as-Code Go lib](./go-sdk.md)
