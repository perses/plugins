# ClickHouse plugin for Perses

The ClickHouse plugin runs SQL against [ClickHouse](https://clickhouse.com) through its HTTP interface. It provides time series, log, trace and profile queries, a variable, an annotation and an explorer, and lists the alerts of [ClickStack](https://clickhouse.com/docs/use-cases/observability/clickstack).

The queries read any table. They know the tables written by the ClickHouse exporter of the OpenTelemetry Collector and by ClickStack: metrics with their histograms and exemplars, logs, traces and profiles.

See the [documentation](https://github.com/perses/plugins/blob/main/docs/clickhouse/README.md) of the plugins, and [Writing queries](https://github.com/perses/plugins/blob/main/docs/clickhouse/queries.md) for the macros, the variables and the columns each query expects.

## Datasource setup

### ClickHouse

Use a proxied datasource pointing at the HTTP interface of ClickHouse, such as `http://clickhouse.example.com:8123`, and allow `POST ^/$`, for the queries, and `GET ^/ping$`, for the connection test. Store the credentials of the ClickHouse user in a Perses Secret referenced by the proxy.

The plugin sends every query as read-only (`readonly=2`), with a few settings making the results unambiguous and bounded: ISO date/times, quoted 64-bit integers and a limit of 100 000 rows. This is no protection against a user editing a dashboard: connect with a ClickHouse user that is only granted `SELECT` on the tables to display. When that user is not allowed to change settings (`readonly=1`), the plugin stops sending them and reads the results as they come.

Datasources created before queries were sent with `POST` allow `GET` on the root path only. They keep working: their queries are sent in the URL, which limits their size.

Set the default database of the datasource to the one holding the tables, for instance the database of the OpenTelemetry tables, to write queries without qualifying them.

### ClickStack

The ClickStack datasource reads the alerts from the API of ClickStack (HyperDX), at `http://<host>:8000`, or at `http://<host>:8080/api` when only the port of the UI is reachable. Use a proxied datasource allowing `GET ^/api/v2/alerts$` and `GET ^/api/v2$`, with a Secret holding an API key of ClickStack as a bearer token. ClickStack does not accept the requests of browsers other than the ones of its own UI.

The ClickHouse server of ClickStack is a ClickHouse datasource like any other.

## Development

Install the dependencies from the root of the repository, then start the dev server of the plugin:

```bash
npm install
npm run dev -w clickhouse
```

Check the plugin:

```bash
npm run lint -w clickhouse
npm run type-check -w clickhouse
npm run test -w clickhouse
percli plugin test-schemas --plugin.path=clickhouse
(cd clickhouse && go test ./...)
```
