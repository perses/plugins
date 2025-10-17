# Pyroscope plugins

The Pyroscope package includes several plugins that provide comprehensive support for Pyroscope continuous profiling in Perses dashboards.

## Datasource (`PyroscopeDatasource`)

The Pyroscope datasource enables connection between Perses and your Pyroscope instance for continuous profiling data. It works with profiling-related panels and queries.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#pyroscopedatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Profile Query (`PyroscopeProfileQuery`)

The Pyroscope profile query plugin enables querying profiling data from your Pyroscope instance. It supports profile queries and flame graph generation.

See also technical docs related to this plugin:

- [Data model](./model.md#pyroscopeprofilequery)
- [Dashboard-as-Code Go lib](./go-sdk/query.md)

## Explorer (`PyroscopeExplorer`)

The Pyroscope explorer plugin provides an interactive exploration interface for profiling data, allowing users to drill down into performance bottlenecks.
