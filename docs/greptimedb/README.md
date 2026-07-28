---
tags:
    - datasource
---

# GreptimeDB plugins

The GreptimeDB package includes several plugins that provide comprehensive support for GreptimeDB in Perses dashboards.

## Datasource (`GreptimeDBDatasource`)

The GreptimeDB datasource enables connection between Perses and your GreptimeDB instance for SQL querying. It works with various visualization panels and supports SQL queries against the GreptimeDB HTTP SQL API (`POST /v1/sql`).

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#greptimedbdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Time Series Query (`GreptimeDBTimeSeriesQuery`)

The GreptimeDB time series query plugin enables executing SQL queries against your GreptimeDB database for time-based data visualization.

See also technical docs related to this plugin:

- [Data model](./model.md#greptimedbtimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/timeseries-query.md)

## Log Query (`GreptimeDBLogQuery`)

The GreptimeDB log query plugin enables querying log data stored in your GreptimeDB database using SQL.

See also technical docs related to this plugin:

- [Data model](./model.md#greptimedblogquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)

## Trace Query (`GreptimeDBTraceQuery`)

The GreptimeDB trace query plugin enables querying trace data stored in your GreptimeDB database using SQL. It works with trace visualization panels such as [Trace Table](../tracetable/README.md) and [Tracing Gantt Chart](../tracingganttchart/README.md).

See also technical docs related to this plugin:

- [Data model](./model.md#greptimedbtracequery)
- [Dashboard-as-Code Go lib](./go-sdk/trace-query.md)
