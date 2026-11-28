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

The Trino time series query runs a SQL query that returns a `time` column. Number-typed and boolean columns are
values and every other column is a label that splits the rows into series. Use `{start}` and `{end}` to filter on the dashboard time
range.

See also technical docs related to this plugin:

- [Data model](./model.md#trinotimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/timeseries-query.md)

## Log Query (`TrinoLogQuery`)

The Trino log query runs a SQL query whose rows become log entries. The entry time comes from the first column named
`timestamp`, `log_time`, or `time`.

See also technical docs related to this plugin:

- [Data model](./model.md#trinologquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)

## Trace Query (`TrinoTraceQuery`)

The Trino trace query reads spans stored in a Trino table, for example OpenTelemetry spans exported to Iceberg or Hive.
Rows are grouped by `trace_id` into search results for the TraceTable and ScatterChart panels. When the result holds a
single `trace_id`, it returns only the full trace for the TracingGanttChart panel (a search that matches exactly one trace is shown as that
trace, so TraceTable and ScatterChart see no search results for it). Use `{start}` and `{end}` to filter
on the dashboard time range.

See also technical docs related to this plugin:

- [Data model](./model.md#trinotracequery)
- [Dashboard-as-Code Go lib](./go-sdk/trace-query.md)

## JSON Query (`TrinoJsonQuery`)

The Trino JSON query runs a SQL query and returns each row as an object keyed by column name, for the Table panel. No
`time` column is needed. A JSON query has no dashboard time range, so `{start}` and `{end}` are not replaced.

See also technical docs related to this plugin:

- [Data model](./model.md#trinojsonquery)
- [Dashboard-as-Code Go lib](./go-sdk/json-query.md)

## SQL Variable (`TrinoSQLVariable`)

The Trino SQL variable fills a list variable from a SQL query: the first column is the value and an optional second
column is the display label.

See also technical docs related to this plugin:

- [Data model](./model.md#trinosqlvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable.md)
