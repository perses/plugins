---
tags:
    - datasource
---

# Trino plugins

The Trino package includes plugins that run SQL against a [Trino](https://trino.io) coordinator through its HTTP
statement API, so Perses dashboards can chart and list data from any catalog Trino can query.

## Datasource (`TrinoDatasource`)

The Trino datasource connects Perses to a Trino coordinator. It supports the
[proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses, which is the recommended setup: credentials
stay in a Perses Secret, and the identity sent to Trino is set on the server.

See also technical docs related to this plugin:

- [Data model](./model.md#trinodatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Time Series Query (`TrinoTimeSeriesQuery`)

The Trino time series query runs a SQL query that returns a `time` column and one numeric column per series. Use
`{start}` and `{end}` to filter on the dashboard time range.

See also technical docs related to this plugin:

- [Data model](./model.md#trinotimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/timeseries-query.md)

## Log Query (`TrinoLogQuery`)

The Trino log query runs a SQL query whose rows become log entries. The entry time comes from the first column named
`timestamp`, `log_time`, or `time`.

See also technical docs related to this plugin:

- [Data model](./model.md#trinologquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)
