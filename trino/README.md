# Trino plugin for Perses

The Trino plugin runs SQL against a Trino coordinator using its HTTP statement API. It provides time series, log, trace and
JSON query plugins that can be used with the corresponding Perses panels, and a SQL variable plugin that fills list
variables.

## Datasource setup

Use a proxied datasource pointing at the Trino coordinator base URL, such as `https://trino.example.com`, and allow
`POST /v1/statement`, `GET /v1/statement/.*`, and `DELETE /v1/statement/.*` (used to cancel queries that are no longer
needed). Store credentials in a Perses Secret referenced by the proxy: Perses ignores an `Authorization` header placed
in the proxy `headers`. A direct URL only works when the coordinator accepts unauthenticated cross-origin requests from
the browser.

Unless Trino sets `http-server.process-forwarded=true`, it answers HTTP 406 to any `X-Forwarded-*` header, and a reverse
proxy in front of Perses can add several. The editor's proxy defaults therefore set `allowHeaders` to the headers the
plugin sends: `Content-Type`, `X-Trino-User`, `X-Trino-Catalog`, `X-Trino-Schema`, `X-Trino-Session`, `X-Trino-Source`,
`X-Trino-Time-Zone`, `X-Trino-Routing-Group`, and `X-Trino-Client-Capabilities`. The allowlist also applies to headers configured in the proxy
`headers`, so add any other header you configure there. Perses adds the Secret or OAuth credential after filtering.

For a shared Trino account, set `X-Trino-User` in the proxy `headers`. Perses sets configured headers on the server and
they replace any value the browser sends. Leave it unset when the credential already identifies the user. Trino only
checks impersonation when `X-Trino-User` differs from the authenticated user, and its default access control denies
impersonation, so pinning another user needs impersonation rules (for example in file-based access control). With
`allow-all` access control or broad impersonation rules, remove `X-Trino-User` from `allowHeaders` when it is not
configured in `headers`, so viewers cannot choose a user.

**Per-user identity.** To run queries as the viewer rather than a shared account, set `oauthPassthrough: true` in the
datasource proxy spec. Perses then forwards the access token the identity provider issued to the viewer (Perses login
through OIDC or OAuth 2.0) as the `Authorization` bearer token. Enable Trino's JWT or OAuth2 authentication so it can
validate that token (trusting its issuer and signing keys), and point `http-server.authentication.jwt.principal-field`
(or the `oauth2` equivalent) at the claim that holds the username, such as `preferred_username` or `email`; use
`http-server.authentication.jwt.user-mapping.pattern` to reshape it if needed. Leave `X-Trino-User` unset so Trino takes
the user from the verified token.

The plugin follows Trino's `nextUri` links through the Perses proxy and combines result pages up to 100,000 rows. Larger
results are cut at that limit and the remaining query is cancelled. Requests send `X-Trino-Time-Zone: UTC`. A request
that fails with 502, 503 or 504 is tried up to three times. Inside Perses, a 429 is not retried yet: its `Retry-After`
header doesn't reach the plugin.

Trino sends `timestamp(9)` values to clients as milliseconds unless they ask for the full precision. Only trace queries
do, by sending `X-Trino-Client-Capabilities: PARAMETRIC_DATETIME`; a proxy datasource that does not allow that header
still works, with millisecond precision in traces. With a direct URL the browser sends it cross-origin, so a CORS setup
in front of Trino with an explicit header list must include it, or trace queries fail while the other queries work.

Queries are submitted as plain SQL. Use `{start}` and `{end}` in a query to interpolate the dashboard time range in UTC,
for example:

```sql
SELECT date_trunc('minute', event_time) AS time, count(*) AS events
FROM iceberg.analytics.events
WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
GROUP BY 1
ORDER BY 1
```

Each query and variable can also set a catalog, schema, source label, routing group, and session properties, and
each of them can use dashboard variables. These populate `X-Trino-Catalog`, `X-Trino-Schema`, `X-Trino-Source`, and
`X-Trino-Routing-Group` (used by Trino Gateway). Session properties are `name=value` entries separated by commas or line
breaks (for example, `query_max_run_time=5m`); the plugin URL-encodes each value and sends them as the `X-Trino-Session`
header. When the same header is also set in the datasource proxy `headers`, the datasource value wins. Interpolate free-text variables into SQL with `${name:sqlstring}`, which quotes and escapes
the value as a string literal.

## Result shape

Time series queries need a column named `time`. Number-typed columns (`tinyint`, `smallint`, `integer`, `bigint`,
`real`, `double`, `number`, `decimal`) and `boolean` columns (plotted as 0 and 1) are values, and every other column is
a label. Rows are grouped by their label values into one series per value column and label set, and null or non-numeric
values in value columns become gaps. An extra timestamp, date, or string id column therefore splits the result into one
series per value: drop it, or cast it to a number. A numeric id column is a value series; cast it to `varchar` to use it
as a label, and cast numbers stored as strings to `double` to plot them. A null label is left out of the series labels
and kept apart from an empty one; use `coalesce(region, '')` to merge them. Series are ordered by their labels and
capped at 1000; the rest are dropped with a warning. Series are named like Prometheus series: with one value column
`{host="a", region="eu"}`, with several `avg_cpu{host="a"}` (whose labels also carry `__name__="avg_cpu"`), and with no
label columns the column name.

Log queries take the entry time from the first column named `timestamp`, `log_time`, or `time` (case-insensitive). Every
column becomes a label and is also rendered in the log line.

Timestamps without a time zone are read as UTC, and a numeric time column is read as epoch milliseconds (`to_unixtime()`
returns seconds, so multiply it by 1000). Rows whose time column cannot be parsed are skipped. Time series panels show a
warning for skipped rows, for results cut at the row limit, for results cut at the series limit, and for results with
rows but no value column; log panels do not display these warnings yet.

## Trace queries

`TrinoTraceQuery` reads spans from a SQL result by column name, matched case-insensitively. Every row is a span:

- `trace_id`, `span_id` and `start_time` (or `timestamp`) are required.
- `parent_span_id`, `service_name` and `span_name` are optional. A null or empty parent marks a root span.
- The span end comes from `end_time`, `duration_ms`, or `duration_nano` (also `duration_ns`).
- `status_code` (or `span_status_code`) is optional: the span is an error when it is `ERROR`, `STATUS_CODE_ERROR` or `2`.
  `status_message` (or `span_status_message`) is optional too.
- `span_kind` is optional: a number 0-5, a bare name such as `SERVER`, or `SPAN_KIND_SERVER`. Anything else is
  `SPAN_KIND_UNSPECIFIED`.
- `attributes` is optional: a Trino `map`, a JSON object, or a JSON string. Any other value becomes a single attribute
  named `attributes`.
- The GreptimeDB trace query columns are accepted too: `timestamp`, `duration_nano`, `span_status_code`,
  `span_attributes.*`, `resource_attributes.*`, `span_kind`, `scope_name` and `scope_version`.

`timestamp(9)` values keep their nanoseconds (see the proxy note above), numeric times are epoch milliseconds as in the
other queries, and `varbinary` id columns are converted to lowercase hex. `to_hex()` returns uppercase, so wrap it in
`lower()` when you select ids as text. Rows are grouped by `trace_id` into search results for the TraceTable and
ScatterChart panels. When the result holds a single `trace_id`, the query returns only the full trace for the
TracingGanttChart panel. A search that matches exactly one trace is shown as that trace, so TraceTable and ScatterChart see no search
results for it. `{start}` and `{end}` work as in the time series query. Rows without a trace id, span id or
parseable start time are skipped with a warning.

Search many traces (all spans of the 100 latest traces of a service in the time range; spans of a picked trace that
start before `{start}` are left out):

```sql
WITH recent AS (
  SELECT trace_id
  FROM iceberg.otel.spans
  WHERE service_name IN (${service:sqlstring})
    AND start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
  GROUP BY trace_id
  ORDER BY max(start_time) DESC
  LIMIT 100
)
SELECT
  lower(to_hex(s.trace_id)) AS trace_id,
  lower(to_hex(s.span_id)) AS span_id,
  lower(to_hex(s.parent_span_id)) AS parent_span_id,
  s.service_name,
  s.name AS span_name,
  s.start_time,
  s.end_time,
  s.status_code
FROM iceberg.otel.spans s
JOIN recent r ON s.trace_id = r.trace_id
WHERE s.start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
ORDER BY s.start_time DESC
```

One trace for a TracingGanttChart, with a duration instead of an end time:

```sql
SELECT
  lower(to_hex(trace_id)) AS trace_id,
  lower(to_hex(span_id)) AS span_id,
  lower(to_hex(parent_span_id)) AS parent_span_id,
  service_name,
  name AS span_name,
  kind AS span_kind,
  start_time,
  to_milliseconds(end_time - start_time) AS duration_ms,
  status_code,
  attributes
FROM iceberg.otel.spans
WHERE trace_id = from_hex(${trace_id:sqlstring})
ORDER BY start_time
```

## JSON queries

`TrinoJsonQuery` returns each row as an object keyed by column name for the Table panel. Integer-like column names come
first, and a repeated column name keeps only the last value. No `time` column is needed. Results over 100,000 rows are
cut with the same warning as the other queries. A JSON query gets no dashboard time range from Perses and does not re-
run when it changes, so `{start}` and `{end}` are not replaced: filter on the current time instead.

```sql
SELECT
  service_name,
  count(*) AS spans,
  count_if(status_code = 'ERROR') AS errors,
  round(100e0 * count_if(status_code = 'ERROR') / count(*), 2) AS error_pct
FROM iceberg.otel.spans
WHERE start_time > current_timestamp - INTERVAL '1' HOUR
GROUP BY service_name
ORDER BY errors DESC, spans DESC
LIMIT 10
```

## SQL variables

`TrinoSQLVariable` fills a list variable from a query. The first column is the value and an optional second column is
the display label. Nulls are skipped, duplicate values are removed (the first one wins), and only the first 10,000 rows
are read: the query is cancelled there and later rows are dropped without a warning. The query can use other variables
and `{start}` and `{end}`.

Trino sends `bigint` values as JSON numbers, which lose precision above 2^53. Cast large numeric ids to `varchar`
(`SELECT CAST(host_id AS varchar) ...`) so the variable value matches the stored one.

```sql
-- a region picker
SELECT DISTINCT region FROM iceberg.ops.hosts WHERE region IS NOT NULL ORDER BY region

-- value and display label
SELECT CAST(host_id AS varchar) AS value, concat(hostname, ' (', coalesce(region, 'unknown'), ')') AS label
FROM iceberg.ops.hosts
ORDER BY label

-- depends on the $env variable and the time range
SELECT DISTINCT service_name
FROM iceberg.otel.spans
WHERE start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
  AND element_at(attributes, 'deployment.environment') = ${env:sqlstring}
ORDER BY service_name
```

## Development

Run `npm install` at the plugin repository root, then use `npm run dev -w trino` to start the plugin dev server or
`npm run build -w trino` to build it.
