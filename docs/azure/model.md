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
  # Each request can batch metrics for up to 50 resources.
  # Once hitting the request cap, further resources are ignored (i.e. only `maxRequestsPerQuery * 50` resources are fetched).
  # Defaults to 20 (1000 resources).
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

Azure Resource Manager as a datasource is basically an HTTP server. So we need to define an HTTP config. The target URL (direct or proxy) should always be `https://management.azure.com`.

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

  # Caps how many paginated requests are issued to collect all the results of a query.
  # Each request can fetch up to 1000 results.
  # Once hitting the request cap, further results are ignored (i.e. only `maxRequestsPerQuery * 1000` results are fetched).
  # Defaults to 5 (5000 results).
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

  # A filter restricting the metrics returned. More details on the filter syntax is available in Azure documentation:
  # https://learn.microsoft.com/en-us/rest/api/monitor/filter-syntax?view=rest-monitor-2023-10-01
  filter: <string> # Optional

  # ISO8601 duration setting the time grain of the returned data points, e.g. "PT1M".
  # Defaults to "PT1M" if not specified.
  # The only interval well supported for metrics is a 1 minute interval (PT1M), shorter or longer
  # intervals *may* be supported based on the metric (not well documented except in API error responses).
  # Some intervals likely to be supported are: PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H, P1D
  interval: <string> # Optional

  # Return a time series with a single data point for each metric. Equivalent to an interval the size of the timerange.
  # Defaults to false.
  singlePoint: <boolean> # Optional

  # Only applies when `singlePoint` is true. Flattens multiple metrics on individual resourceIDs into a single time series
  # per resource and per unique set of metadata. Values of each metric-aggregation pair are mapped to individual labels.
  # Mainly useful for tables to display values for multiple metrics for a single resource ID in a single row.
  # Defaults to false.
  flattenMetrics: <boolean> # Optional

  # Limit the number of records returned per resourceID. Only applies when a `Filter` is provided. Defaults to 10.
  top: <int> # Optional

  # Orders the results by a given aggregation in a given direction. e.g. "sum asc"
  # Note: For this purpose, the aggregation "total" = "sum"
  orderBy: <string> # Optional

  # Dimension used to roll up the results.
  rollupBy: <string> # Optional
```

`datasource`, `subscriptionId`, the entries of `resourceIds` and `filter` can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).
When using a variable containing multiple values for `resourceIds`, it **must** use CSV format (e.g. `${myvariable:csv}) to be split and parsed correctly.

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

`datasource`, `kqlQuery`, and the entries of `subscriptions` and `managementGroups`, can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).
When using a variable containing multiple values for `subscriptions` or `managementGroups`, it **must** use CSV format (e.g. `${myvariable:csv}) to be split and parsed correctly.

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

`datasource`, `kqlQuery`, and the entries of `subscriptions` and `managementGroups`, can contain [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).
When using a variable containing multiple values for `subscriptions` or `managementGroups`, it **must** use CSV format (e.g. `${myvariable:csv}) to be split and parsed correctly.

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
      valueColumnName: "type"
      labelColumnName: "name"
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
