# Loki plugins

The Loki package includes several plugins that provide comprehensive support for Grafana Loki log aggregation in Perses dashboards.

## Datasource (`LokiDatasource`)

The Loki datasource enables connection between Perses and your Loki instance for log aggregation and querying. It works with log-related panels and queries.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#lokidatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Time Series Query (`LokiTimeSeriesQuery`)

The Loki time series query plugin enables querying metric data from your Loki instance using LogQL aggregation queries for time-based visualization.

See also technical docs related to this plugin:

- [Data model](./model.md#lokitimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/timeseries-query.md)

## Log Query (`LokiLogQuery`)

The Loki log query plugin enables querying log data from your Loki instance using LogQL syntax. It supports log queries, filtering, and text search.

See also technical docs related to this plugin:

- [Data model](./model.md#lokilogquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)
