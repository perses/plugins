---
tags:
    - datasource
---

# Azure plugins

The Azure package includes several plugins that provide support for Microsoft Azure in Perses dashboards: two datasources, two queries, and a variable.

## Regional Metrics datasource (`AzureRegionalMetricsDatasource`)

The Regional Metrics datasource enables connection between Perses and an Azure Monitor regional endpoint: its `directUrl` or `proxy` must target the regional endpoint of the resources being queried (e.g. `https://eastus.metrics.monitor.azure.com`). It is used by the `AzureMetricsBatchQuery` plugin.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#azureregionalmetricsdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource/regional-metrics.md)

## Resource Manager datasource (`AzureResourceManagerDatasource`)

The Resource Manager datasource enables connection between Perses and the Azure Resource Manager to view current resource configuration, reached through endpoint (`https://management.azure.com`). It is used by the `AzureResourceGraphKqlQuery` and `AzureResourceGraphKqlVariable` plugins.

It supports the [proxy](https://perses.dev/perses/docs/concepts/proxy/) feature of Perses that allows to restrict the access to your data source.

See also technical docs related to this plugin:

- [Data model](./model.md#azureresourcemanagerdatasource)
- [Dashboard-as-Code Go lib](./go-sdk/datasource/resource-manager.md)

## Metrics Batch query (`AzureMetricsBatchQuery`)

The Metrics Batch query plugin fetches metric values for one or more Azure resources efficiently (batched requests) to the [Metrics Batch API](https://learn.microsoft.com/en-us/rest/api/monitor/metrics-batch/batch?view=rest-monitor-2023-10-01), returning time series data for use in metric panels such as the Time Series Chart. Because the API only accepts up to 50 resource IDs per call, the plugin automatically splits large resource lists into several batched requests, up to the `maxRequestsPerQuery` limit configured on the `AzureRegionalMetricsDatasource`. Even though the purpose is to allow requesting metrics for multiple resources simultaneously, it is still perfectly capable of requesting metrics for individual resources with no loss of functionality.

See also technical docs related to this plugin:

- [Data model](./model.md#azuremetricsbatchquery)
- [Dashboard-as-Code Go lib](./go-sdk/query/metrics-batch.md)

## Resource Graph KQL query (`AzureResourceGraphKqlQuery`)

The Resource Graph KQL query plugin runs a [Kusto Query Language](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/index) query against the [Resource Graph API](https://learn.microsoft.com/en-us/rest/api/azureresourcegraph/resourcegraph/resources/resources?view=rest-azureresourcegraph-resourcegraph-2024-04-01), returning tabular data in JSON format for use in panels such as the Table panel.

The query can be scoped to specific subscriptions and/or management groups; when neither is set, Azure Resource Graph queries across all subscriptions the caller has access to.

See also technical docs related to this plugin:

- [Data model](./model.md#azureresourcegraphkqlquery)
- [Dashboard-as-Code Go lib](./go-sdk/query/resource-graph-kql.md)

## Resource Graph KQL variable (`AzureResourceGraphKqlVariable`)

The Resource Graph KQL variable plugin performs a similar query to the Resource Graph KQL Query plugin, but instead maps the returned table data to a list of label-value pairs, offering them as dashboard variable options. The table columns used as the label or value can be customised.

See also technical docs related to this plugin:

- [Data model](./model.md#azureresourcegraphkqlvariable)
- [Dashboard-as-Code Go lib](./go-sdk/variable/resource-graph-kql.md)
