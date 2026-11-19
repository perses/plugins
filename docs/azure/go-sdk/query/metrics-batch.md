# Azure Metrics Batch Query Go SDK

## Constructor

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

var options []metricsbatchquery.Option
metricsbatchquery.AzureMetricsBatch(subscriptionId, resourceIds, metricNamespace, metricNames, options...)
```

Need to provide the subscription ID, the resource IDs, the metric namespace, the metric names, and a list of options.

## Default options

- [SubscriptionID()](#subscriptionid): with the subscription ID provided in the constructor.
- [ResourceIDs()](#resourceids): with the resource IDs provided in the constructor.
- [MetricNamespace()](#metricnamespace): with the metric namespace provided in the constructor.
- [MetricNames()](#metricnames): with the metric names provided in the constructor.

## Available options

As an implementation of the [Azure Metrics Batch API](https://learn.microsoft.com/en-us/rest/api/monitor/metrics-batch/batch?view=rest-monitor-2023-10-01), further details on each field can also be found there.

#### SubscriptionID

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.SubscriptionID("00000000-0000-0000-0000-000000000000")
```

Define the UUID of the Azure subscription the resources belong to.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

#### ResourceIDs

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.ResourceIDs("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg", "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg2")
```

Define the resource IDs to fetch metrics for.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).
Variables containing multiple values **must** use CSV format (e.g. `${myvariable:csv}) to be split and parsed correctly.

#### AddMetricName

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.AddMetricName("Percentage CPU")
```

Append a metric name to the list of metrics to fetch.

#### MetricNamespace

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.MetricNamespace("Microsoft.Compute/virtualMachines")
```

Define the namespace the metrics belong to.

#### MetricNames

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.MetricNames("Percentage CPU", "Available Memory Percentage")
```

Define the names of the metrics to fetch.

#### Aggregation

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Aggregation(metricsbatchquery.AggregationAverage, metricsbatchquery.AggregationMaximum)
```

Define the aggregations to compute for each metric.
If empty, Azure picks the most relevant one.
Available values: `AggregationAverage`, `AggregationCount`, `AggregationMaximum`, `AggregationMinimum`, `AggregationTotal`.

#### Filter

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Filter("tagName eq 'value'")
```

Define a filter restricting the metrics returned. More details on the filter syntax is available in Azure documentation:
https://learn.microsoft.com/en-us/rest/api/monitor/filter-syntax?view=rest-monitor-2023-10-01.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

#### Interval

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Interval("PT5M")
```

ISO8601 duration setting the time grain of the returned data points, e.g. "PT1M".
Defaults to "PT1M" if not specified.
The only interval well supported for metrics is a 1 minute interval (PT1M), shorter or longer
intervals *may* be supported based on the metric (not well documented except in API error responses).
Some intervals likely to be supported are: PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H, P1D

#### SinglePoint

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.SinglePoint(true)
```

Return a time series with a single data point for each metric. Equivalent to an interval the size of the timerange.
Defaults to `false`.

#### FlattenMetrics

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.FlattenMetrics(true)
```

Only applies when `SinglePoint` is enabled.
Flattens multiple metrics on individual resources into a single time series per resource and per unique set of metadata.
Values of each metric-aggregation pair are mapped to individual labels.
Mainly intended for tables to display multiple metrics for a single resource in a single row.
Defaults to `false`.

#### Top

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Top(10)
```

Limit the number of records returned per resourceID. Only applies when a `Filter` is provided. Defaults to 10.

#### OrderBy

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.OrderBy("sum asc")
```

Defines which aggregation to order results by and in which direction.
Note: For this purpose, the aggregation "total" = "sum"

#### RollupBy

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.RollupBy("tagName")
```

Define the dimension used to roll up (aggregate) the results.

#### Datasource

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Datasource("eastus")
```

Define the `AzureRegionalMetricsDatasource` the query will use.
Supports [variables](https://perses.dev/perses/docs/concepts/variable/#using-variables).

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"
	timeseries "github.com/perses/plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("Azure Dashboard",
		dashboard.AddPanelGroup("Compute",
			panelgroup.AddPanel("CPU Usage",
				timeseries.Chart(),
				panel.AddQuery(
					metricsbatchquery.AzureMetricsBatch(
						"00000000-0000-0000-0000-000000000000",
						[]string{"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg"},
						"Microsoft.Compute/virtualMachines",
						[]string{"Percentage CPU"},
						metricsbatchquery.Aggregation(metricsbatchquery.AggregationAverage),
						metricsbatchquery.Datasource("eastus"),
					),
				),
			),
		),
	)
}
```
