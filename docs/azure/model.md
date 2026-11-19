# Azure plugin models

This documentation provides the definition of the different plugins related to Azure.

## AzureRegionalMetricsDatasource

Azure Regional Metrics as a datasource is basically an HTTP server. So we need to define an HTTP config. The target URL (direct or proxy) should be of the form `https://{region_name}.metrics.monitor.azure.com` (e.g. `https://eastus.metrics.monitor.azure.com`). The list of valid region names (programatic name) can be found in [Azure regions list docs](https://learn.microsoft.com/en-us/azure/reliability/regions-list?tabs=all).

```yaml
kind: "AzureRegionalMetricsDatasource"
spec:
  # It is the url of the datasource.
  # Leave it empty if you don't want to access the datasource directly from the UI.
  # You should define a proxy if you want to access the datasource through the Perses' server,
  # which is almost certainly required as Azure generally requires credentials for access.
  directUrl: <url> # Optional

  # It is the http configuration that will be used by the Perses' server to redirect to the datasource any query sent by the UI.
  proxy: <HTTP Proxy specification> # Optional

  # Caps how many batched requests are issued to fetch metrics for all the resources of a query.
  # Each request can batch metrics for up to 50 resources, so a query targeting more resources than
  # `maxRequestsPerQuery * 50` only gets metrics for the first ones. Defaults to 20 (1000 resources).
  maxRequestsPerQuery: <int> # Optional
```

One of `directUrl` or `proxy` must be set, but not both.

### HTTP Proxy specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

### Example

A typical Azure Regional Metrics datasource (using proxy configuration) would be:

```yaml
kind: "Datasource"
metadata:
  name: "AzureEastUS"
  project: "infrastructure"
spec:
  default: true
  plugin:
    kind: "AzureRegionalMetricsDatasource"
    spec:
      maxRequestsPerQuery: 10
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "https://eastus.metrics.monitor.azure.com"
          allowedEndpoints:
            - endpointPattern: "/subscriptions/.*/metrics:getBatch"
              method: "POST"
          secret: "azure_secret_config"
```

## AzureResourceManagerDatasource

Azure Regional Metrics as a datasource is basically an HTTP server. So we need to define an HTTP config. The target URL (direct or proxy) should always be `https://management.azure.com`.

```yaml
kind: "AzureResourceManagerDatasource"
spec:
  # It is the url of the datasource.
  # Leave it empty if you don't want to access the datasource directly from the UI.
  # You should define a proxy if you want to access the datasource through the Perses' server,
  # which is almost certainly required as Azure generally requires credentials for access.
  directUrl: <url> # Optional

  # It is the http configuration that will be used by the Perses' server to redirect to the datasource any query sent by the UI.
  proxy: <HTTP Proxy specification> # Optional

  # Caps how many paginated requests are issued to collect all the results of a query. Must be greater than 0.
  # Defaults to 5.
  maxRequestsPerQuery: <int> # Optional
```

One of `directUrl` or `proxy` must be set, but not both.

### HTTP Proxy specification

See [common plugin definitions](https://perses.dev/perses/docs/plugins/common/#http-proxy-specification).

### Example

A typical Azure Resource Manager datasource (using proxy configuration) would be:

```yaml
kind: "Datasource"
metadata:
  name: "AzureResourceManager"
  project: "infrastructure"
spec:
  default: true
  plugin:
    kind: "AzureResourceManagerDatasource"
    spec:
      maxRequestsPerQuery: 5
      proxy:
        kind: "HTTPProxy"
        spec:
          url: "https://management.azure.com"
          allowedEndpoints:
            - endpointPattern: "/providers/Microsoft.ResourceGraph/resources"
              method: "POST"
          secret: "azure_secret_config"
```

## AzureMetricsBatchQuery

Perses supports batched metrics queries for Azure Monitor: `AzureMetricsBatchQuery`. This is an implementation of the [Metrics Batch API](https://learn.microsoft.com/en-us/rest/api/monitor/metrics-batch/batch?view=rest-monitor-2023-10-01). Being batched, it can request metrics for multiple resources efficiently, but is still capable of requesting for a single resource with all the same functionality.

```yaml
kind: "AzureMetricsBatchQuery"
spec:
  # `datasource` is a datasource selector. If not provided, the default AzureRegionalMetricsDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Azure Regional Metrics Datasource selector> # Optional

  # The UUID of the Azure subscription the resources belong to.
  subscriptionId: <string>

  # Resource IDs of the Azure resources to fetch metrics for.
  resourceIds:
    - <string>

  # Namespace the metrics belong to.
  metricNamespace: <string>

  # Names of the metrics to fetch.
  metricNames:
    - <string>

  # Aggregations to compute for each metric. If empty, Azure picks the most relevant one.
  aggregation:
    - <enum = "average" | "count" | "maximum" | "minimum" | "total"> # Optional

  # An OData filter restricting the metrics returned, e.g. by dimension value.
  filter: <string> # Optional

  # ISO8601 duration setting the time grain of the returned data points, e.g. "PT1M". Defaults to the
  # dashboard interval. Note: Azure may not support all possible intervals!
  interval: <string> # Optional

  # Returns a time series with a single data point for the entire time range per time series.
  # Defaults to false.
  singlePoint: <boolean> # Optional

  # Only applies when `singlePoint` is true. Flattens metrics into a single time series (per unique set of
  # metadata) with a single data point per resource ID. Values of each metric-aggregation pair are mapped to
  # individual labels. Mainly useful for tables to display values for multiple metrics on a single resource ID
  # in a single row. Defaults to false.
  flattenMetrics: <boolean> # Optional

  # Limits the number of resources returned.
  top: <int> # Optional

  # Field used to order the results when `top` is set, e.g. "total desc".
  orderBy: <string> # Optional

  # Dimension used to roll up the results.
  rollupBy: <string> # Optional
```

`datasource`, `subscriptionId`, the entries of `resourceIds` and `filter` can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

- See [Azure Regional Metrics Datasource selector](#azure-regional-metrics-datasource-selector)

### Example

A simple metrics batch query:

```yaml
kind: "TimeSeriesQuery"
spec:
  plugin:
    kind: "AzureMetricsBatchQuery"
    spec:
      subscriptionId: "00000000-0000-0000-0000-000000000000"
      resourceIds:
        - "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg"
      metricNamespace: "Microsoft.Compute/virtualMachines"
      metricNames:
        - "Percentage CPU"
      aggregation:
        - "average"
      interval: "PT1M"
```

## AzureResourceGraphKqlQuery

Perses supports Azure Resource Graph queries: `AzureResourceGraphKqlQuery`.

```yaml
kind: "AzureResourceGraphKqlQuery"
spec:
  # `datasource` is a datasource selector. If not provided, the default AzureResourceManagerDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Azure Resource Manager Datasource selector> # Optional

  # The KQL expression executed against Azure Resource Graph.
  kqlQuery: <string>

  # Subscription UUIDs to scope the query to. If neither `subscriptions` nor `managementGroups` is set,
  # the query runs across all the subscriptions the caller has access to.
  subscriptions:
    - <string> # Optional

  # Management groups to scope the query to.
  managementGroups:
    - <string> # Optional
```

`kqlQuery`, and the entries of `subscriptions` and `managementGroups`, can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

- See [Azure Resource Manager Datasource selector](#azure-resource-manager-datasource-selector)

### Example

A simple Resource Graph query:

```yaml
kind: "JsonQuery"
spec:
  plugin:
    kind: "AzureResourceGraphKqlQuery"
    spec:
      kqlQuery: "Resources | project name, type"
```

## AzureResourceGraphKqlVariable

Perses supports list variables backed by Azure Resource Graph: `AzureResourceGraphKqlVariable`.

```yaml
kind: "AzureResourceGraphKqlVariable"
spec:
  # `datasource` is a datasource selector. If not provided, the default AzureResourceManagerDatasource is used.
  # See the documentation about the datasources to understand how it is selected.
  datasource: <Azure Resource Manager Datasource selector> # Optional

  # The KQL expression executed against Azure Resource Graph.
  kqlQuery: <string>

  # Subscription UUIDs to scope the query to. If neither `subscriptions` nor `managementGroups` is set,
  # the query runs across all the subscriptions the caller has access to.
  subscriptions:
    - <string> # Optional

  # Management groups to scope the query to.
  managementGroups:
    - <string> # Optional

  # Column of the result used as the displayed label of each option. Defaults to the value of `valueColumnName`.
  labelColumnName: <string> # Optional

  # Column of the result used as the value of each option.
  valueColumnName: <string>
```

`kqlQuery`, and the entries of `subscriptions` and `managementGroups`, can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

- See [Azure Resource Manager Datasource selector](#azure-resource-manager-datasource-selector)

### Example

```yaml
kind: "ListVariable"
spec:
  name: "resourceName"
  plugin:
    kind: "AzureResourceGraphKqlVariable"
    spec:
      kqlQuery: "Resources | project name, type"
      valueColumnName: "name"
      labelColumnName: "type"
```

## Shared definitions

### Azure Regional Metrics Datasource selector

!!! note
See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "AzureRegionalMetricsDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```

### Azure Resource Manager Datasource selector

!!! note
See [Selecting / Referencing a Datasource](https://github.com/perses/perses/blob/main/docs/api/datasource.md#selecting--referencing-a-datasource)

```yaml
kind: "AzureResourceManagerDatasource"
# The name of the datasource regardless its level
name: <string> # Optional
```
