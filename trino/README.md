# Trino plugin for Perses

The Trino plugin runs SQL against a Trino coordinator using its HTTP statement API. It provides time series and log query
plugins that can be used with the corresponding Perses panels.

## Datasource setup

Set the datasource URL to the Trino coordinator base URL, such as `https://trino.example.com`. For a proxied datasource,
allow `POST /v1/statement` and `GET /v1/statement/.*`. Configure the `Authorization: Bearer <JWT>` header and, when
needed, `X-Trino-Catalog`, `X-Trino-Schema`, and other authentication headers in the datasource proxy settings. The
plugin derives `X-Trino-User` from the configured JWT claim (default: `sub`; set the claim to match Trino's
`http-server.authentication.oauth2.principal-field`). It sends that header with the initial statement and every result
page. The plugin follows Trino's `nextUri` links through the Perses proxy and combines all result pages.

The browser must have access to the bearer JWT to derive the claim. OAuth passthrough tokens injected only by the Perses
server are not visible to the plugin and cannot be used for this derivation.

Queries are submitted as plain SQL. Use `{start}` and `{end}` in a query to interpolate the dashboard time range in UTC,
for example:

```sql
SELECT date_trunc('minute', event_time) AS time, count(*) AS events
FROM iceberg.analytics.events
WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
GROUP BY 1
ORDER BY 1
```

## Development

Run `npm install` at the plugin repository root, then use `npm run dev -w trino` to start the plugin dev server or
`npm run build -w trino` to build it.
