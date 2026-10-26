---
tags:
  - datasource
---
# OpenSearch plugins

The OpenSearch plugin package provides support for [OpenSearch](https://opensearch.org/) in Perses dashboards. Logs can be queried with [PPL (Piped Processing Language)](https://docs.opensearch.org/latest/sql-and-ppl/ppl/index/), [SQL](https://docs.opensearch.org/latest/sql-and-ppl/sql/index/), [Lucene / query string](https://docs.opensearch.org/latest/query-dsl/full-text/query-string/) or raw [Query DSL](https://docs.opensearch.org/latest/query-dsl/), selected per query. PPL and SQL require the SQL/PPL plugin on your cluster — it ships with OpenSearch by default. Lucene and Query DSL use the core `_search` API.

## Datasource (`OpenSearchDatasource`)

The OpenSearch datasource enables connection between Perses and your OpenSearch cluster for log aggregation and querying. It works with log-related panels and queries.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source. Each query language uses its own endpoint, so allow the ones you need:

| Query language    | Endpoint                | `endpointPattern` |
|-------------------|-------------------------|-------------------|
| PPL               | `POST /_plugins/_ppl`   | `/_plugins/_ppl`  |
| SQL               | `POST /_plugins/_sql`   | `/_plugins/_sql`  |
| Lucene, Query DSL | `POST /{index}/_search` | `/.*/_search`     |

A datasource created in the Perses UI allows all three by default. A datasource created before SQL, Lucene and Query DSL support only allows `/_plugins/_ppl`; queries in the other languages are then rejected by the proxy with a 403 until you add their endpoints.

See also technical docs related to this plugin:

- [Data model](./model.md#opensearchdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Log Query (`OpenSearchLogQuery`)

The OpenSearch log query plugin enables querying log data from your OpenSearch cluster. The `queryLanguage` field selects how `query` is interpreted:

| `queryLanguage` | `query` is                                   | `index`                                       |
|-----------------|----------------------------------------------|-----------------------------------------------|
| `ppl` (default) | a PPL expression                             | Optional, see [Index pattern](#index-pattern) |
| `sql`           | a SQL statement                              | Ignored — the index comes from `FROM`         |
| `lucene`        | a query string; blank matches every document | Required                                      |
| `dsl`           | a JSON `_search` request body                | Required                                      |

A query without `queryLanguage` is a PPL query, so dashboards saved before the other languages existed keep working.

See also technical docs related to this plugin:

- [Data model](./model.md#opensearchlogquery)
- [Dashboard-as-Code Go lib](./go-sdk/log-query.md)

### Index pattern

For Lucene and Query DSL, `index` is required: it is the index or index pattern in the `POST /{index}/_search` request path. For SQL it is ignored. For PPL, the `index` field of the query is prepended to your expression as a `source=<index>` clause. It is ignored when your expression already starts with `source=` (or `search source=`), so you can either set the index once on the query or write the source clause yourself.

### Result limit

`limit` sets how many log documents a Lucene or Query DSL query fetches, as the `_search` request's `size`. It defaults to 500 and must be a positive integer. For Query DSL, a `size` in your request body is kept, but capped at `limit` when both are set. `limit` does not apply to PPL or SQL — use `head` or `LIMIT` in the query instead.

### Automatic time filtering

The panel time range is added to every query as a filter on the timestamp field:

- **SQL**: sent in the `_sql` request's `filter` field, so your statement is sent unchanged.
- **Lucene and Query DSL**: added as a `range` clause in `bool.filter`. Lucene queries sit in the same `bool.filter`; a Query DSL `query` goes under `bool.must`, so `_score` sorting, `track_scores` and `min_score` still work. A Query DSL body without a `query` key is filtered on the time range alone.
- **PPL**: injected into the query as a `where` clause on the timestamp field, placed immediately after the source clause so it applies before any pipe that drops the timestamp column, such as `stats` or `fields`. A query written as:

```ppl
source=otel-logs-demo | where severityText='ERROR'
```

is sent to OpenSearch as:

```ppl
source=otel-logs-demo | where `@timestamp` >= '2026-07-14T03:53:33.000Z' and `@timestamp` <= '2026-07-14T04:53:33.000Z' | where severityText='ERROR'
```

Set `disableTimeFilter` to `true` to turn this off, in every language, and manage the time bounds yourself.

Lucene and Query DSL results are sorted newest first on the timestamp field. A Query DSL body that sets its own `sort` keeps it.

### Field mapping

OpenSearch does not enforce a schema, and field names vary by exporter. Each PPL or SQL result row, and each Lucene or Query DSL hit's `_source` (flattened to dot-separated keys), is mapped to a log entry by looking up a timestamp column and a message column, trying these names in order:

- **timestamp**: `@timestamp`, `timestamp`, `time`
- **message**: `message`, `log`, `body`

Set `timestampField` or `messageField` on the query to prefer a different name; the defaults above are still used as fallbacks. Every remaining field becomes a label on the log entry. If no message column matches, the whole row is serialized to JSON as the log line so no data is lost.

!!! note
    The `timestampField` override also determines the field used by the automatic time filter and, for Lucene and Query DSL, the sort, which default to `@timestamp` alone. If your index stores its timestamp as `time` or `timestamp`, set `timestampField` explicitly, otherwise the time filter references a field that does not exist and the query fails or returns no logs.
