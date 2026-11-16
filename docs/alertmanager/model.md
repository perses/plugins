# Alertmanager plugins data model

This document describes the data models used by Alertmanager plugins in Perses.

## AlertManagerDatasource

The `AlertManagerDatasource` plugin provides configuration for connecting to Prometheus Alertmanager instances. One of `directUrl` or `proxy` must be set.

### YAML Specification

```yaml
kind: "AlertManagerDatasource"
spec:
  # Direct URL to the Alertmanager instance
  # Leave empty if accessing through proxy only
  directUrl: <url> # Optional

  # HTTP proxy configuration for accessing Alertmanager through Perses server
  proxy: <HTTP Proxy specification> # Optional
```

### HTTP Proxy specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

### Example

```yaml
apiVersion: v1
kind: Datasource
metadata:
  name: alertmanager-production
  project: observability
spec:
  default: false
  plugin:
    kind: AlertManagerDatasource
    spec:
      directUrl: "http://alertmanager.example.com:9093"
```

## AlertManagerAlertsQuery

```yaml
kind: "AlertManagerAlertsQuery"
spec:
  # Optional datasource selector. If not provided, the default AlertManagerDatasource is used
  # See the documentation about datasources to understand selection
  datasource: <Alertmanager Datasource selector> # Optional

  # Label matchers used to filter the alerts, such as `severity="critical"`
  filters:
    - <string> # Optional

  # Whether to return the active alerts
  active: <boolean> # Optional

  # Whether to return the silenced alerts
  silenced: <boolean> # Optional

  # Whether to return the inhibited alerts
  inhibited: <boolean> # Optional

  # Whether to return the unprocessed alerts
  unprocessed: <boolean> # Optional

  # Receiver of the alerts to return
  receiver: <string> # Optional
```

Each field is sent as the parameter of the same name of the Alertmanager `/api/v2/alerts` API endpoint (`filters` as `filter`). The fields that are not set are not sent, so the defaults of Alertmanager apply. `filters` and `receiver` can contain variables.

### Example

```yaml
kind: AlertManagerAlertsQuery
spec:
  datasource:
    kind: AlertManagerDatasource
    name: alertmanager-production
  filters:
    - severity="critical"
    - environment=~"$env"
  active: true
  silenced: false
  inhibited: false
```

This query returns the active alerts, but not the silenced or inhibited ones, that have the `critical` severity in the environments selected by the `env` variable.

## AlertManagerSilencesQuery

```yaml
kind: "AlertManagerSilencesQuery"
spec:
  # Optional datasource selector. If not provided, the default AlertManagerDatasource is used
  # See the documentation about datasources to understand selection
  datasource: <Alertmanager Datasource selector> # Optional

  # Label matchers used to filter the silences, such as `alertname="HighMemory"`
  filters:
    - <string> # Optional
```

`filters` is sent as the `filter` parameter of the Alertmanager `/api/v2/silences` API endpoint, and can contain variables.

### Example

```yaml
kind: AlertManagerSilencesQuery
spec:
  datasource:
    kind: AlertManagerDatasource
    name: alertmanager-production
  filters:
    - team="platform"
```

## AlertTable

```yaml
kind: "AlertTable"
spec:
  # Labels used to group the alerts when the panel loads. Defaults to [alertname].
  # An entry can be a variable, such as `$groupBy`.
  defaultGroupBy:
    - <string> # Optional

  columns:
    - <Alert column specification> # Optional

  # Defaults to the deduplication by fingerprint.
  deduplication: <Deduplication specification> # Optional

  # Actions available on each alert. Defaults to all of them.
  allowedActions:
    - <enum = "silence" | "runbook"> # Optional

  # Annotation holding the runbook URL of an alert. Defaults to `runbook_url`.
  runbookAnnotationKey: <string> # Optional

  labelColorMappings:
    - <Label color mapping specification> # Optional
```

### Alert column specification

A column displays the value of an alert label.

```yaml
# Name of the label displayed in the column
name: <string>

# Header of the column. Defaults to the name of the label.
header: <string> # Optional

# Defaults to true.
enableSorting: <boolean> # Optional

# Initial sort of the table on this column
sort: <enum = "asc" | "desc"> # Optional

# Defaults to "alphabetical".
sortMode: <enum = "alphabetical" | "numeric" | "severity"> # Optional
```

### Deduplication specification

```yaml
mode: <enum = "none" | "fingerprint" | "labels">

# Labels whose values identify an alert, used with the "labels" mode
labels:
  - <string> # Optional
```

### Label color mapping specification

```yaml
# Name of the label whose values are colored
labelKey: <string>

# Color of the values that don't match any override: "auto" computes a color from the value,
# "severity" uses the color of the severity level of the value (critical, error, warning, info, ...),
# and "manual" uses a gray color.
mode: <enum = "auto" | "severity" | "manual">

# Colors applied before the mode, the first matching override wins
overrides:
  - value: <string>
    isRegex: <boolean>
    color: <string>
```

### Example

```yaml
kind: AlertTable
spec:
  defaultGroupBy:
    - alertname
    - namespace
  columns:
    - name: severity
      sort: asc
      sortMode: severity
    - name: namespace
      header: Namespace
  deduplication:
    mode: labels
    labels:
      - alertname
      - instance
  allowedActions:
    - silence
  labelColorMappings:
    - labelKey: severity
      mode: severity
      overrides:
        - value: "page"
          isRegex: false
          color: "#d32f2f"
```

## SilenceTable

```yaml
kind: "SilenceTable"
spec:
  columns:
    - <Silence column specification> # Optional

  # Actions available on each silence. Defaults to all of them.
  allowedActions:
    - <enum = "expire"> # Optional
```

### Silence column specification

The `status`, `matchers` and `comment` columns are always displayed first, and the table is initially sorted by status. The entries of `columns` named `status`, `matchers` or `comment` are ignored: each other entry adds a column after them.

```yaml
# Field of the silence displayed in the column:
# createdBy, startsAt, endsAt, duration or updatedAt
name: <string>

# Header of the column. Defaults to the name of the field, such as "Creator" for createdBy.
header: <string> # Optional

# Defaults to true.
enableSorting: <boolean> # Optional

sort: <enum = "asc" | "desc"> # Optional

# Defaults to "date" for startsAt, endsAt and updatedAt, and to "alphabetical" otherwise.
sortMode: <enum = "alphabetical" | "date" | "status"> # Optional
```

### Example

```yaml
kind: SilenceTable
spec:
  columns:
    - name: createdBy
    - name: endsAt
      header: Expires
  allowedActions:
    - expire
```

## Alertmanager Datasource selector

!!! note
    See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "AlertManagerDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
