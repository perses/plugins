# Plugin Module: opensearch

Datasource plugin for [OpenSearch](https://opensearch.org/) in Perses. Log queries can
be written in [PPL](https://docs.opensearch.org/latest/sql-and-ppl/ppl/index/),
[SQL](https://docs.opensearch.org/latest/sql-and-ppl/sql/index/),
[Lucene / query string](https://docs.opensearch.org/latest/query-dsl/full-text/query-string/),
or raw [Query DSL](https://docs.opensearch.org/latest/query-dsl/), selected per query.
PPL and SQL need the SQL/PPL plugin enabled on the cluster; Lucene and Query DSL use
the core `_search` API.

Set `queryLanguage` on the query to `ppl` (the default), `sql`, `lucene` or `dsl`.
Lucene and Query DSL queries also need an `index` and accept an optional `limit`
(500 by default). The dashboard time range is added to every query automatically
unless `disableTimeFilter` is set. If you use the Perses proxy, allow the endpoint for
each language: `/_plugins/_ppl`, `/_plugins/_sql` and `/.*/_search`. See the
[plugin documentation](../docs/opensearch/README.md) and the
[data model](../docs/opensearch/model.md) for details.

This plugin is intended to display logs alongside the traces surfaced by the Tempo plugin, so a user can
pivot from a trace to the related logs in OpenSearch.

### How to install

This plugin requires react and react-dom 18.

```bash
npm install react@18 react-dom@18
npm install @perses-dev/opensearch-plugin
```

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # build the plugin
npm test         # run unit tests
```

## Trace to logs

This plugin is intended to display logs alongside traces produced by the Tempo or
Jaeger plugins. Use a dashboard variable (e.g. `$traceId`) to share the selected
trace between the trace panel and the OpenSearch logs panel.

PPL example:

```
source=otel-logs-* | where traceId='$traceId'
```

A complete example dashboard is in `docs/examples/trace-to-logs.json`. See
`docs/examples/README.md` for field-name conventions and how to swap Tempo for Jaeger.

## Field overrides

OpenSearch is schema-flexible; field names vary by exporter. The plugin tries
common names by default (`@timestamp`/`timestamp`/`time` for the timestamp;
`message`/`log`/`body` for the message). If your index uses different names,
set `timestampField` and `messageField` on the query spec.
