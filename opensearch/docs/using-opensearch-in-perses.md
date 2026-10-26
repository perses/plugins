# Get insights from your OpenSearch data in Perses

[Perses](https://perses.dev/) is an open, GitOps-friendly dashboarding and
observability tool. Historically it has been strongest for metrics and traces —
but logs are usually where an investigation actually ends. The **OpenSearch
datasource plugin** now **ships bundled with Perses**, so out of the box you can
query your OpenSearch logs directly from a dashboard using
[PPL (Piped Processing Language)](https://docs.opensearch.org/latest/sql-and-ppl/ppl/index/)
and put them next to the metrics and traces you already have.

This guide walks you through it end to end: stand up OpenSearch, run Perses (the
plugin is already built in — nothing to install), wire up a datasource, and run
your first PPL queries. At the end there's a bonus section on correlating a trace
with its logs.

Every command and every query output below was run against OpenSearch 2.19 and a
current Perses image before it was written down.

## What you'll build

A Perses datasource pointing at OpenSearch, and log panels driven by PPL — for
example, "show me the ERROR logs from `payment-svc` in the current time range,"
or "show me every log line that belongs to this one trace."

## Prerequisites

To *use* the plugin you only need:

- A **current Perses release** — the OpenSearch plugin ships bundled, so there's
  nothing to install (you'll confirm this in [Step 2](#step-2--run-perses)).
- An **OpenSearch** cluster. PPL and SQL queries also need the SQL/PPL plugin —
  bundled by default. Lucene and Query DSL use the core `_search` API.

**If you already have Perses and OpenSearch running,** jump straight to
[Step 3](#step-3--add-the-opensearch-datasource) and add the datasource — you can
ignore everything before it.

The rest of the tutorial stands up OpenSearch and Perses locally, which also needs:

- **Docker** (with Compose).

> **Running an older Perses that predates the plugin?** See the note at the end of
> [Step 2](#step-2--run-perses) for loading it as a released archive — though the
> simplest path is to upgrade Perses.

## Step 1 — Get OpenSearch running (with some data)

The plugin ships a ready-to-use Compose file at
[`docs/examples/docker-compose.yml`](./examples/docker-compose.yml). It starts a
single-node OpenSearch (security disabled, CORS enabled for local use) plus
OpenSearch Dashboards:

```bash
cd opensearch/docs/examples
docker compose up -d opensearch
```

Wait for the cluster to go green:

```bash
curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[a-z]*"'
# "status":"green"
```

> **Already have OpenSearch?** Point the datasource at your own cluster in Step 3
> and skip the seeding below. PPL and SQL queries need the **SQL/PPL plugin**
> enabled, which ships with OpenSearch by default; Lucene and Query DSL don't.

For the tutorial we'll seed a handful of OTel-style log documents so there's
something to query. The docs carry a `@timestamp`, a `body` (the log message), a
`traceId`, and a `service.name`:

```bash
curl -s -X PUT http://localhost:9200/otel-logs-demo -H 'Content-Type: application/json' -d '{
  "mappings": { "properties": {
    "@timestamp":   { "type": "date" },
    "body":         { "type": "text" },
    "traceId":      { "type": "keyword" },
    "severityText": { "type": "keyword" },
    "service":      { "properties": { "name": { "type": "keyword" } } }
  }}
}'

# a couple of documents sharing one traceId, plus some standalone lines
curl -s -X POST http://localhost:9200/_bulk -H 'Content-Type: application/x-ndjson' --data-binary '
{"index":{"_index":"otel-logs-demo"}}
{"@timestamp":"'"$(date -u -d '3 minutes ago' +%FT%T.000Z)"'","severityText":"INFO","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","service":{"name":"checkout-api"},"body":"GET /cart/items 200 in 34ms"}
{"index":{"_index":"otel-logs-demo"}}
{"@timestamp":"'"$(date -u -d '2 minutes ago' +%FT%T.000Z)"'","severityText":"ERROR","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","service":{"name":"payment-svc"},"body":"charge failed: gateway timeout after 3 retries"}
{"index":{"_index":"otel-logs-demo"}}
{"@timestamp":"'"$(date -u -d '1 minutes ago' +%FT%T.000Z)"'","severityText":"WARN","service":{"name":"search-svc"},"body":"cache miss for key products:featured"}
'
curl -s -X POST http://localhost:9200/otel-logs-demo/_refresh
```

## Step 2 — Run Perses

Current Perses images ship the OpenSearch plugin, so there's nothing to build,
download, or configure — just start Perses:

```yaml
# perses-compose.yml
services:
  perses:
    image: persesdev/perses:latest
    ports:
      - "8080:8080"
```

```bash
docker compose -f perses-compose.yml up -d
```

Confirm the plugin is there. It registers both a datasource and a query plugin:

```bash
curl -s http://localhost:8080/api/v1/plugins | \
  python3 -c "import sys,json; [print(p['kind'],'->',p['spec']['name']) for m in json.load(sys.stdin) if m['metadata']['name']=='OpenSearch' for p in m['spec']['plugins']]"
# Datasource -> OpenSearchDatasource
# LogQuery   -> OpenSearchLogQuery
```

That's the whole "installation" — the plugin is part of the Perses distribution.

> **Older Perses without the plugin bundled?** Add it from a released
> `OpenSearch-<version>.tar.gz` ([perses/plugins releases](https://github.com/perses/plugins/releases))
> via Perses' plugin archive path (`PERSES_PLUGIN_ARCHIVE_PATHS`). Note that setting
> is a **list** — include the image's built-in archive path as well, or you'll drop
> the other bundled plugins. Simpler, though, is to upgrade Perses. If you're
> *developing* the plugin from source, build it with `percli plugin build` and use
> the live dev loop (`percli plugin start`); see the repository
> [README](../../README.md#development).

## Step 3 — Add the OpenSearch datasource

A datasource tells Perses how to reach your cluster. The recommended setup routes
requests through the **Perses backend proxy** — the browser talks to Perses,
Perses talks to OpenSearch — so you don't need CORS on the cluster and any
credentials stay server-side.

You can create it in the UI (**Datasources → Add**, pick *OpenSearch Datasource*),
or provision it as YAML. As a `GlobalDatasource`:

```yaml
kind: GlobalDatasource
metadata:
  name: opensearch-demo
spec:
  default: true
  plugin:
    kind: OpenSearchDatasource
    spec:
      proxy:
        kind: HTTPProxy
        spec:
          url: http://opensearch:9200        # your cluster URL
          allowedEndpoints:
            - endpointPattern: /_plugins/_ppl
              method: POST
            - endpointPattern: /_plugins/_sql
              method: POST
            - endpointPattern: /.*/_search
              method: POST
```

> **Upgrading an existing datasource?** Datasources created before SQL/Lucene/Query
> DSL support was added allow only `/_plugins/_ppl`, so SQL and `_search` requests
> will be rejected by the Perses proxy with a `403` until you add
> `/_plugins/_sql` and `/.*/_search` to `allowedEndpoints`.

## Choosing a query language

Each log query picks its own language with the **Query language** dropdown:

| Language | Endpoint | Index field | Notes |
| --- | --- | --- | --- |
| PPL (default) | `POST /_plugins/_ppl` | Optional — ignored if your query starts with `source=` | Requires the SQL/PPL plugin on the cluster |
| SQL | `POST /_plugins/_sql` | Ignored — the index is in your `FROM` clause | Requires the SQL/PPL plugin on the cluster |
| Lucene | `POST /{index}/_search` | **Required** | The query string syntax used in Dashboards Discover |
| Query DSL | `POST /{index}/_search` | **Required** | Paste a `_search` request body straight from Dev Tools |

The dashboard time range is applied automatically in every language — as a `where`
clause for PPL, as a condition added to the outer `WHERE` for SQL, and as a `bool.filter` range
clause for Lucene and Query DSL (a Query DSL `query` goes under `bool.must`, so scoring
still works). Untick **Use dashboard time range** (under **Options**) to manage
the bounds yourself.

**Ordering differs by language.** Lucene and Query DSL sort newest-first — the
plugin adds an explicit `sort` on the timestamp field. PPL and SQL return results
in cluster order unless you sort in the query yourself (`sort - @timestamp` for
PPL, `ORDER BY` for SQL). Switching a panel's query language can therefore reorder
its rows even though nothing else about the query changed.

**SQL time filtering rewrites the `WHERE` clause.** The plugin ANDs a condition on
the timestamp field into your outer `WHERE`, or inserts one before `GROUP BY`,
`HAVING`, `ORDER BY` or `LIMIT`. It only does this for a single `SELECT … FROM`
query: a statement with `UNION` or `JOIN`, or one that isn't a `SELECT`, fails with
an error asking you to untick **Use dashboard time range** and filter on the
timestamp yourself. `$__from` and `$__to` hold the panel time range in epoch
milliseconds for that, in every language:

```sql
SELECT * FROM `logs-*`
WHERE `@timestamp` >= FROM_UNIXTIME($__from / 1000.0)
  AND `@timestamp` <= FROM_UNIXTIME($__to / 1000.0)
```

> Verified against OpenSearch 2.19.6 (`distribution: opensearch`) using a
> single-node example cluster, including indices with microsecond `date_nanos`
> timestamps.

For Lucene and Query DSL the **Limit** field sets the `_search` `size`. If you leave it
empty the plugin sends 500, because OpenSearch's own default is only 10 documents —
which would silently truncate a log panel. For PPL and SQL, cap results yourself with
`head` or `LIMIT`.

**An empty Lucene query still runs.** Every other language short-circuits a blank
query without contacting OpenSearch, but a blank Lucene query legitimately means
"everything in the time range" — so as soon as an index is set, it fetches up to
the Limit.

Query DSL input is treated as a complete `_search` request body. Your `size` and
`sort` win over the defaults; your `query`, if present, is ANDed with the time range.

To provision it at startup, drop the file in a folder and add
`PERSES_PROVISIONING_FOLDERS_0=/etc/perses/provisioning` (plus the matching
volume) to the Perses service.

You can sanity-check the datasource straight through the Perses proxy — this is
the exact path the plugin uses at runtime:

```bash
curl -s -X POST \
  http://localhost:8080/proxy/globaldatasources/opensearch-demo/_plugins/_ppl \
  -H 'Content-Type: application/json' \
  -d '{"query":"source=otel-logs-demo | fields severityText, `service.name`, body | head 1"}'
```

A `200` with a PPL result body means the whole path — browser → Perses proxy →
OpenSearch — is working:

```json
{
  "schema": [
    { "name": "severityText", "type": "string" },
    { "name": "service.name", "type": "string" },
    { "name": "body",         "type": "string" }
  ],
  "datarows": [
    [ "INFO", "checkout-api", "GET /cart/items 200 in 34ms" ]
  ],
  "total": 1,
  "size": 1
}
```

> **Prefer a direct connection?** Instead of `proxy`, set
> `directUrl: http://localhost:9200`. The browser then calls OpenSearch directly,
> which is why the example Compose file enables CORS. The proxy setup is the
> better default for anything beyond local tinkering.

## Step 4 — Query your logs with PPL

This is the core of getting insight out of OpenSearch. Add a panel to a dashboard,
choose the **OpenSearch Log Query** type, and you get an editor with these fields:

| Field | What it does |
| --- | --- |
| **Query language** | Selects PPL, SQL, Lucene, or Query DSL. It's the first control in the editor, and it changes how the fields below are used and what the query field expects. |
| **Datasource** | Which OpenSearch datasource to query. |
| **Index pattern** | e.g. `logs-*`. For PPL, prepended as `source=<index>` — *ignored if your PPL already starts with `source=`.* For SQL it's ignored (the index comes from your `FROM` clause). Required for Lucene and Query DSL, which send it as `POST /{index}/_search`. |
| **Query** | The query itself, in whichever language you picked above — the field's label changes to match (`PPL Query`, `SQL Query`, `Lucene Query`, or `Query DSL Query`). Each language keeps its own query while you edit, so switching language and back restores what you typed; a language you haven't used yet starts empty with its own placeholder and examples. |
| **Options** → **Timestamp field** *(optional)* | Overrides the default timestamp field. |
| **Options** → **Message field** *(optional)* | Overrides which field becomes the log line. |
| **Options** → **Use dashboard time range** | On by default. Untick it to turn off the automatic time bound (see below). |
| **Options** → **Limit** *(optional — Lucene and Query DSL only)* | Caps the number of documents fetched (the `_search` request's `size`). Leave it empty and the plugin sends 500; the maximum is 10,000, which is all `_search` accepts by default. For PPL and SQL, cap results yourself with `head` or `LIMIT` instead. |

**Options** is collapsed until you open it, and starts open when the query already
changes one of its settings.

A first query — the most recent lines, newest first:

```ppl
source=otel-logs-demo | fields `@timestamp`, severityText, `service.name`, body | sort - `@timestamp` | head 5
```

which returns rows like:

```
2026-07-14 04:51:11  WARN   payment-svc   retry budget low for downstream billing
2026-07-14 04:47:11  INFO   search-svc    query executed hits=44 took=9ms
2026-07-14 04:41:11  INFO   checkout-api  GET /cart/items 200 in 29ms
2026-07-14 04:35:11  ERROR  search-svc    OpenSearch shard unavailable, retrying
2026-07-14 04:28:11  WARN   payment-svc   connection pool at 85% capacity
```

PPL reads left to right: a `source=` selects the index, and each `|` pipes rows
into the next command — `where` to filter, `fields` to project, `stats` to
aggregate, `sort`/`head` to order and limit. A few useful shapes:

```ppl
source=logs-* | where level="error" | head 20
source=logs-* | fields @timestamp, service, message | head 50
source=logs-* | stats count() by service
```

### Automatic time filtering

You almost never want *all* logs — you want the ones in the dashboard's time
range. The plugin does this for you: it injects a `where` clause on the timestamp
field bounded to the panel's current range, right after the `source=` clause
(so it applies before any pipe that drops the timestamp column, like `stats`).
The query you write:

```ppl
source=otel-logs-demo | where severityText='ERROR'
```

is sent to OpenSearch as (for a "last 60 minutes" range):

```ppl
source=otel-logs-demo
  | where `@timestamp` >= '2026-07-14T03:53:33.000Z' and `@timestamp` <= '2026-07-14T04:53:33.000Z'
  | where severityText='ERROR'
```

Change the dashboard time picker and the logs follow. If you manage time bounds
yourself, untick **Use dashboard time range** under **Options**.

### Field mapping for schema-flexible indices

OpenSearch doesn't enforce a schema, and field names vary by exporter. The plugin
maps each result row to a log entry by looking for a timestamp field and a message
field, trying these names in order:

- **timestamp:** `@timestamp`, `timestamp`, `time`
- **message:** `message`, `log`, `body`

If your index uses different names — say the log line lives in `msg` — set the
**Message field** (or **Timestamp field**) override on the query, and the plugin
will prefer it. Every other column in the result comes back as a label on the log
entry, so you keep `service.name`, `severityText`, `traceId`, and the rest for
filtering and display.

## Bonus — Correlate a trace with its logs

Because a `traceId` is just another field, you can pivot from a trace straight to
the log lines it produced. Give the dashboard a `traceId` variable and filter on
it:

```ppl
source=otel-logs-demo | where traceId='$traceId'
```

With `$traceId` set to a real trace, that returns the story of a single request:

```
2026-07-14 04:11:10  INFO   checkout-api  GET /cart/items 200 in 34ms
2026-07-14 04:12:10  INFO   checkout-api  validating cart for user 8841
2026-07-14 04:13:10  WARN   payment-svc   payment gateway latency 812ms exceeds soft limit
2026-07-14 04:14:10  ERROR  payment-svc   charge failed: gateway timeout after 3 retries
```

Put a trace panel (Tempo or Jaeger) and an OpenSearch logs panel on the same
dashboard, both reading `$traceId`, and selecting a trace updates the logs to
match. A complete example dashboard lives in
[`docs/examples/trace-to-logs.json`](./examples/trace-to-logs.json); see
[`docs/examples/README.md`](./examples/README.md) for field-name conventions
across exporters and how to swap Tempo for Jaeger.

## Wrap-up

You now have OpenSearch logs available inside Perses: a datasource wired through
the Perses proxy, PPL queries that stay bounded to the dashboard's time range, and
a path from a trace to its logs. From here, add the logs to the dashboards where
you already watch metrics and traces — so the next time something breaks, the
evidence is one panel away.

### Reference

- Plugin source & schema: [`opensearch/`](../)
- OpenSearch PPL reference: <https://docs.opensearch.org/latest/sql-and-ppl/ppl/index/>
- Perses documentation: <https://perses.dev/>
