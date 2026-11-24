---
tags:
  - datasource
---

# Alertmanager plugins

The Alertmanager package includes several plugins that provide support for Prometheus Alertmanager in Perses: a datasource, two queries, two panels and two explorers.

## Datasource (`AlertManagerDatasource`)

The Alertmanager datasource enables connection between Perses and your Alertmanager instance. It works in conjunction with the other plugins from this package, which call the Alertmanager `/api/v2` API through it. Its health check calls the `/api/v2/status` endpoint.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

The plugins of this package also write to Alertmanager through this datasource: the Alert Table panel and the silences explorer create silences (`POST /api/v2/silences`), and the Silence Table panel expires them (`DELETE /api/v2/silence/{id}`). The `allowedActions` option of the panels only hides their buttons. Through the proxy, anyone allowed to read the datasource can call these endpoints, and both the proxy configuration prefilled by the datasource editor and a proxy without `allowedEndpoints` allow them. A read-only datasource needs only the `GET` endpoints, for example:

```yaml
proxy:
  kind: HTTPProxy
  spec:
    url: http://alertmanager:9093
    allowedEndpoints:
      - endpointPattern: /api/v2/alerts
        method: GET
      - endpointPattern: /api/v2/silences
        method: GET
      - endpointPattern: /api/v2/status
        method: GET
```

See also technical docs related to this plugin:

- [Data model](./model.md#alertmanagerdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource.md)

## Alerts query (`AlertManagerAlertsQuery`)

The alerts query plugin lists the alerts of an Alertmanager instance, using the `/api/v2/alerts` API endpoint. It can filter the alerts with label matchers, by state (active, silenced, inhibited, unprocessed) and by receiver. The filters and the receiver can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

The alerts are converted to the generic alert format of Perses: an Alertmanager `active` or `suppressed` alert is `firing` (a `suppressed` one is also flagged as suppressed), and an `unprocessed` alert is `pending`. The `severity` label, if any, is used as the severity of the alert, and the `generatorURL` as its source URL.

See also technical docs related to this plugin:

- [Data model](./model.md#alertmanageralertsquery)
- [Dashboard-as-Code Go lib](./go-sdk/alerts-query.md)

## Silences query (`AlertManagerSilencesQuery`)

The silences query plugin lists the silences of an Alertmanager instance, using the `/api/v2/silences` API endpoint. It can filter the silences with label matchers, which can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

See also technical docs related to this plugin:

- [Data model](./model.md#alertmanagersilencesquery)
- [Dashboard-as-Code Go lib](./go-sdk/silences-query.md)

## Alert Table panel (`AlertTable`)

The Alert Table panel displays the results of alerts queries in a table, with a status and an alert name column, the configured label columns, and the other labels of each alert:

- **Grouping**: alerts are grouped by the values of the labels of `defaultGroupBy` (`alertname` by default). The grouping can be changed from the panel, and each group shows the number of firing, suppressed and pending alerts.
- **Deduplication**: alerts returned by several queries are deduplicated by fingerprint by default, or by the values of a list of labels. The number of duplicates is shown next to each alert.
- **Search**: a search field filters the alerts on their state, labels and annotations.
- **Sorting and label colors**: each label column can be sorted alphabetically, numerically or by severity, and the values of a label can be colored automatically, by severity or with manual overrides.
- **Actions**: an alert that is not suppressed can be silenced from the panel, with a silence prefilled with its labels, and an alert can link to its runbook, read from the `runbook_url` annotation by default. Only `http` and `https` runbook URLs are linked.

See also technical docs related to this plugin:

- [Data model](./model.md#alerttable)
- [Dashboard-as-Code Go lib](./go-sdk/alert-table.md)

## Silence Table panel (`SilenceTable`)

The Silence Table panel displays the results of silences queries in a table. The `Status`, `Matchers` and `Comment` columns are always displayed, and columns can be added for the creator, the start and end dates, the duration and the update date of the silences. A search field filters the silences on their state, creator, comment and matchers, and a silence can be expired from the panel, after a confirmation.

See also technical docs related to this plugin:

- [Data model](./model.md#silencetable)

## Explore (`AlertManagerAlertsExplorer` and `AlertManagerSilencesExplorer`)

The Alertmanager package comes also with two explorers:

- The alerts explorer runs alerts queries and displays the result in an Alert Table panel.
- The silences explorer runs silences queries, displays the result in a Silence Table panel, and allows to create a silence.
