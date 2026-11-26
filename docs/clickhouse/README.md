---
tags:
    - datasource
---

# ClickHouse plugins

The ClickHouse package includes plugins that run SQL against [ClickHouse](https://clickhouse.com) through its HTTP interface, so Perses can display the metrics, logs, traces and profiles stored in it. They read any table, and know the tables written by the [ClickHouse exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter) of the OpenTelemetry Collector and by [ClickStack](https://clickhouse.com/docs/use-cases/observability/clickstack). The package also lists the alerts of ClickStack.

See [Writing queries](./queries.md) for the macros, the variables and the columns each query expects.

## Datasource (`ClickHouseDatasource`)

The ClickHouse datasource connects Perses to the HTTP interface of a ClickHouse server. It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses, which is the recommended setup: the credentials of the ClickHouse user stay in a Perses Secret. Queries are sent as read-only, but only the grants of the ClickHouse user are a guarantee: connect with a read-only user.

See also technical docs related to this plugin:

- [Data model](./model.md#clickhousedatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Time Series Query (`ClickHouseTimeSeriesQuery`)

The ClickHouse time series query runs a SQL query and reads its numeric columns as values and its other columns as labels splitting the rows into series. A query without a time column is a table. It also reads the histograms and the exemplars of the OpenTelemetry metric tables.

See also technical docs related to this plugin:

- [Writing time series queries](./queries.md#time-series-queries)
- [Data model](./model.md#clickhousetimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/timeseries-query.md)

## Log Query (`ClickHouseLogQuery`)

The ClickHouse log query runs a SQL query whose rows are logs: a time column, a line and labels. In the log explorer, it also charts the volume of the logs over time, by level.

See also technical docs related to this plugin:

- [Writing log queries](./queries.md#log-queries)
- [Data model](./model.md#clickhouselogquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)

## Trace Query (`ClickHouseTraceQuery`)

The ClickHouse trace query reads the traces stored in the OpenTelemetry schema. A trace ID displays the trace, and a SQL query returning spans searches their traces.

See also technical docs related to this plugin:

- [Writing trace queries](./queries.md#trace-queries)
- [Data model](./model.md#clickhousetracequery)
- [Dashboard-as-Code Go lib](./go-sdk/trace-query.md)

## Profile Query (`ClickHouseProfileQuery`)

The ClickHouse profile query builds a flame graph from the samples returned by a SQL query, such as the ones of the OpenTelemetry profiles table.

See also technical docs related to this plugin:

- [Writing profile queries](./queries.md#profile-queries)
- [Data model](./model.md#clickhouseprofilequery)
- [Dashboard-as-Code Go lib](./go-sdk/profile-query.md)

## Variable (`ClickHouseSQLVariable`)

The ClickHouse SQL variable lists the values of a dashboard variable with a SQL query.

See also technical docs related to this plugin:

- [Writing variable queries](./queries.md#variable-queries)
- [Data model](./model.md#clickhousesqlvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable.md)

## Annotation (`ClickHouseSQLAnnotation`)

The ClickHouse SQL annotation marks the events returned by a SQL query, such as deployments or alert notifications, on the charts of a dashboard.

See also technical docs related to this plugin:

- [Writing annotation queries](./queries.md#annotation-queries)
- [Data model](./model.md#clickhousesqlannotation)
- [Dashboard-as-Code Go lib](./go-sdk/annotation.md)

## Explorer (`ClickHouseExplorer`)

The ClickHouse explorer runs ad hoc queries from the Explore page of Perses: time series as a graph or as a table, trace searches and traces, and profiles. Logs are explored with the log explorer, which runs the log queries of every datasource.

## ClickStack Datasource (`ClickStackDatasource`)

The ClickStack datasource connects Perses to the API of ClickStack (HyperDX). ClickStack only answers to the browsers of its own UI and requires an API key, so it is reached through the [proxy](https://perses.dev/perses/docs/concepts/proxy/) of Perses, with a Secret holding the key.

See also technical docs related to this plugin:

- [Data model](./model.md#clickstackdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/clickstack-datasource.md)

## ClickStack Alerts Query (`ClickStackAlertsQuery`)

The ClickStack alerts query lists the alerts defined in ClickStack with their current state, to display them in an alert table.

See also technical docs related to this plugin:

- [Data model](./model.md#clickstackalertsquery)
- [Dashboard-as-Code Go lib](./go-sdk/clickstack-alerts-query.md)
