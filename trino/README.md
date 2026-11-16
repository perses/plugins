# Trino plugin for Perses

The Trino plugin runs SQL against a Trino coordinator using its HTTP statement API. It provides time series and log query
plugins that can be used with the corresponding Perses panels.

## Datasource setup

Use a proxied datasource pointing at the Trino coordinator base URL, such as `https://trino.example.com`, and allow
`POST /v1/statement`, `GET /v1/statement/.*`, and `DELETE /v1/statement/.*` (used to cancel queries that are no longer
needed). Store credentials in a Perses Secret referenced by the proxy: Perses ignores an `Authorization` header placed
in the proxy `headers`. A direct URL only works when the coordinator accepts unauthenticated cross-origin requests from
the browser.

Set the datasource **user** to send `X-Trino-User`. Leave it empty when the credential already identifies the user,
for example a JWT or OAuth2 token whose principal Trino extracts itself. The user is asserted by the browser and is not
verified by Perses, so do not grant the proxy credential broad impersonation rights in Trino.

The plugin follows Trino's `nextUri` links through the Perses proxy and combines result pages up to 100,000 rows. Larger
results are cut at that limit, the remaining query is cancelled, and the panel shows a warning. Requests send
`X-Trino-Time-Zone: UTC`.

Queries are submitted as plain SQL. Use `{start}` and `{end}` in a query to interpolate the dashboard time range in UTC,
for example:

```sql
SELECT date_trunc('minute', event_time) AS time, count(*) AS events
FROM iceberg.analytics.events
WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
GROUP BY 1
ORDER BY 1
```

Each time series or log query can also set a catalog, schema, source label, routing group, and session properties. These
populate `X-Trino-Catalog`, `X-Trino-Schema`, `X-Trino-Source`, and `X-Trino-Routing-Group` (used by Trino Gateway).
Session properties use Trino's comma-separated `name=value` format (for example, `join_distribution_type=AUTOMATIC,
query_max_run_time=5m`) and are sent as the `X-Trino-Session` request header. When the same header is also set in the
datasource proxy `headers`, the datasource value wins.

## Result shape

Time series queries need a column named `time`. Every other column becomes a series, and non-numeric values become
gaps. Return one column per series (wide format); grouping by a label column in long format is not split into series.

Log queries take the entry time from the first column named `timestamp`, `log_time`, or `time` (case-insensitive). Every
column becomes a label and is also rendered in the log line.

Timestamps without a time zone are read as UTC. Rows whose time column cannot be parsed are skipped with a warning.

## Development

Run `npm install` at the plugin repository root, then use `npm run dev -w trino` to start the plugin dev server or
`npm run build -w trino` to build it.
