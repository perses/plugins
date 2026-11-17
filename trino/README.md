# Trino plugin for Perses

The Trino plugin runs SQL against a Trino coordinator using its HTTP statement API. It provides time series and log query
plugins that can be used with the corresponding Perses panels.

## Datasource setup

Use a proxied datasource pointing at the Trino coordinator base URL, such as `https://trino.example.com`, and allow
`POST /v1/statement`, `GET /v1/statement/.*`, and `DELETE /v1/statement/.*` (used to cancel queries that are no longer
needed). Store credentials in a Perses Secret referenced by the proxy: Perses ignores an `Authorization` header placed
in the proxy `headers`. A direct URL only works when the coordinator accepts unauthenticated cross-origin requests from
the browser.

Unless Trino sets `http-server.process-forwarded=true`, it answers HTTP 406 to any `X-Forwarded-*` header, and a reverse
proxy in front of Perses can add several. The editor's proxy defaults therefore set `allowHeaders` to the headers the
plugin sends: `Content-Type`, `X-Trino-User`, `X-Trino-Catalog`, `X-Trino-Schema`, `X-Trino-Session`, `X-Trino-Source`,
`X-Trino-Time-Zone`, and `X-Trino-Routing-Group`. The allowlist also applies to headers configured in the proxy
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

Queries are submitted as plain SQL. Use `{start}` and `{end}` in a query to interpolate the dashboard time range in UTC,
for example:

```sql
SELECT date_trunc('minute', event_time) AS time, count(*) AS events
FROM iceberg.analytics.events
WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
GROUP BY 1
ORDER BY 1
```

Each time series or log query can also set a catalog, schema, source label, routing group, and session properties, and
each of them can use dashboard variables. These populate `X-Trino-Catalog`, `X-Trino-Schema`, `X-Trino-Source`, and
`X-Trino-Routing-Group` (used by Trino Gateway). Session properties are `name=value` entries separated by commas or line
breaks (for example, `query_max_run_time=5m`); the plugin URL-encodes each value and sends them as the `X-Trino-Session`
header. When the same header is also set in the datasource proxy `headers`, the datasource value wins.

## Result shape

Time series queries need a column named `time`. Number-typed columns (`tinyint`, `smallint`, `integer`, `bigint`,
`real`, `double`, `number`, `decimal`) and `boolean` columns (plotted as 0 and 1) are values, and every other column is
a label. Rows are grouped by their label values into one series per value column and label set, and null or non-numeric
values in value columns become gaps. An extra timestamp, date, or string id column therefore splits the result into one
series per value: drop it, or cast it to a number. A numeric id column is a value series; cast it to `varchar` to use it
as a label, and cast numbers stored as strings to `double` to plot them. A null label is the same as an empty one, as in
Prometheus. Series are ordered by their labels and capped at 1000; the rest are dropped with a warning. Series are named
like Prometheus series: with one value column `{host="a", region="eu"}`, with several `avg_cpu{host="a"}` (whose labels
also carry `__name__="avg_cpu"`), and with no label columns the column name.

Log queries take the entry time from the first column named `timestamp`, `log_time`, or `time` (case-insensitive). Every
column becomes a label and is also rendered in the log line.

Timestamps without a time zone are read as UTC, and a numeric time column is read as epoch milliseconds (`to_unixtime()`
returns seconds, so multiply it by 1000). Rows whose time column cannot be parsed are skipped. Time series panels show a
warning for skipped rows, for results cut at the row limit, for results cut at the series limit, and for results with
rows but no value column; log panels do not display these warnings yet.

## Development

Run `npm install` at the plugin repository root, then use `npm run dev -w trino` to start the plugin dev server or
`npm run build -w trino` to build it.
