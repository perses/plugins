---
tags:
  - datasource
---
# OpenSearch plugins

The OpenSearch plugin package provides support for [OpenSearch](https://opensearch.org/) in Perses dashboards. Logs are queried with [PPL (Piped Processing Language)](https://opensearch.org/docs/latest/search-plugins/sql/ppl/index/), which requires the SQL/PPL plugin on your cluster — it ships with OpenSearch by default.

## Datasource (`OpenSearchDatasource`)

The OpenSearch datasource enables connection between Perses and your OpenSearch cluster for log aggregation and querying. It works with log-related panels and queries.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source. All queries are sent to a single endpoint, `POST /_plugins/_ppl`, so that is the only endpoint you need to allow.

See also technical docs related to this plugin:

- [Data model](./model.md#opensearchdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Log Query (`OpenSearchLogQuery`)

The OpenSearch log query plugin enables querying log data from your OpenSearch cluster using PPL syntax. It supports filtering, projection and aggregation through PPL pipes.

See also technical docs related to this plugin:

- [Data model](./model.md#opensearchlogquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)

### Index pattern

The `index` field of the query is prepended to your expression as a `source=<index>` clause. It is ignored when your expression already starts with `source=` (or `search source=`), so you can either set the index once on the query or write the source clause yourself.

### Automatic time filtering

The panel time range is injected into the query as a `where` clause on the timestamp field, placed immediately after the source clause so it applies before any pipe that drops the timestamp column, such as `stats` or `fields`. A query written as:

```ppl
source=otel-logs-demo | where severityText='ERROR'
```

is sent to OpenSearch as:

```ppl
source=otel-logs-demo | where `@timestamp` >= '2026-07-14T03:53:33.000Z' and `@timestamp` <= '2026-07-14T04:53:33.000Z' | where severityText='ERROR'
```

Set `disableTimeFilter` to `true` to turn this off and manage the time bounds yourself.

### Field mapping

OpenSearch does not enforce a schema, and field names vary by exporter. Each row of the PPL response is mapped to a log entry by looking up a timestamp column and a message column, trying these names in order:

- **timestamp**: `@timestamp`, `timestamp`, `time`
- **message**: `message`, `log`, `body`

Set `timestampField` or `messageField` on the query to prefer a different name; the defaults above are still used as fallbacks. Every remaining column of the response becomes a label on the log entry. If no message column matches, the whole row is serialized to JSON as the log line so no data is lost.

!!! note
    The `timestampField` override also determines the column used by the automatic time filter, which defaults to `@timestamp` alone. If your index stores its timestamp as `time` or `timestamp`, set `timestampField` explicitly, otherwise the injected `where` clause references a column that does not exist and OpenSearch rejects the query.
