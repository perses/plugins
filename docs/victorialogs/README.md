# VictoriaLogs plugins

The VictoriaLogs package includes several plugins that provide comprehensive support for VictoriaLogs in Perses dashboards.

## Datasource (`VictoriaLogsDatasource`)

The VictoriaLogs datasource enables connection between Perses and your VictoriaLogs instance for log aggregation and querying. It works with log-related panels and queries.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#victorialogsdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Time Series Query (`VictoriaLogsTimeSeriesQuery`)

The VictoriaLogs time series query plugin enables querying time series data from your VictoriaLogs instance using LogsQL syntax with aggregations.

See also technical docs related to this plugin:

- [Data model](./model.md#victorialogstimeseriesquery)
- [Dashboard-as-Code Go lib](./go-sdk/timeseries-query.md)

## Log Query (`VictoriaLogsLogQuery`)

The VictoriaLogs log query plugin enables querying log data from your VictoriaLogs instance using LogsQL syntax. It supports log queries, filtering, and text search.

See also technical docs related to this plugin:

- [Data model](./model.md#victorialogslogquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)

## Variables

### Field Values Variable (`VictoriaLogsFieldValuesVariable`)

The VictoriaLogs field values variable plugin enables dynamic variable creation from specific field values in your logs.

See also technical docs related to this plugin:

- [Data model](./model.md#victorialogsfieldvaluesvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable/field-values.md)

### Field Names Variable (`VictoriaLogsFieldNamesVariable`)

The VictoriaLogs field names variable plugin enables dynamic variable creation from available field names in your logs.

See also technical docs related to this plugin:

- [Data model](./model.md#victorialogsfieldnamesvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable/field-names.md)
