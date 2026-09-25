---
tags:
  - datasource
---
# ClickHouse plugins

The ClickHouse package includes several plugins that provide comprehensive support for ClickHouse database in Perses dashboards.

## Datasource (`ClickHouseDatasource`)

The ClickHouse datasource enables connection between Perses and your ClickHouse database for analytical querying. It works with various visualization panels and supports SQL queries.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#clickhousedatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Time Series Query (`ClickHouseTimeSeriesQuery`)

The ClickHouse time series query plugin enables executing SQL queries against your ClickHouse database for time-based data visualization. It supports complex analytical queries and aggregations for metrics and time series data.

See also technical docs related to this plugin:

- [Data model](./model.md#clickhousetimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/timeseries-query.md)

## Log Query (`ClickHouseLogQuery`)

The ClickHouse log query plugin enables querying log data stored in your ClickHouse database. It supports log filtering, searching, and analysis for log management use cases.

See also technical docs related to this plugin:

- [Data model](./model.md#clickhouselogquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)

## Trace Query (`ClickHouseTraceQuery`)

The ClickHouse trace query plugin reads traces stored with the schema of the [OpenTelemetry Collector ClickHouse exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter). A trace ID returns the whole trace, for the Tracing Gantt Chart panel. A SQL query returning spans returns trace search results, for the Trace Table panel.

See also technical docs related to this plugin:

- [Data model](./model.md#clickhousetracequery)
- [Dashboard-as-Code Go lib](./go-sdk/trace-query.md)
