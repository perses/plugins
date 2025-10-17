# Tempo plugins

The Tempo package includes several plugins that provide comprehensive support for Grafana Tempo distributed tracing in Perses.

## Datasource (`TempoDatasource`)

The Tempo datasource enables connection between Perses and your Tempo instance for distributed tracing data. It works in conjunction with trace-related panels and queries.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#tempodatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Query (`TempoTraceQuery`)

The Tempo trace query plugin enables querying distributed tracing data from your Tempo instance. It supports trace ID searches and span queries.

See also technical docs related to this plugin:

- [Data model](./model.md#tempotracequery)
- [Dashboard-as-Code Go lib](./go-sdk/query.md)

## Explore (`TempoExplorer`)

The Tempo package comes also with a built-in trace explorer for distributed tracing exploration.
