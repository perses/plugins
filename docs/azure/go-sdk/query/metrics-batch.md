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

As an implementation of the [Azure Metrics Batch API](https://learn.microsoft.com/en-us/rest/api/monitor/metrics-batch/batch?view=rest-monitor-2023-10-01), futher details on each field can also be found there.

#### SubscriptionID

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.SubscriptionID("00000000-0000-0000-0000-000000000000")
```

Define the UUID of the Azure subscription the resources belong to.

#### ResourceIDs

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.ResourceIDs("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg", "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg2")
```

Define the resource IDs to fetch metrics for.

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

Define the aggregations to compute for each metric. Available values: `AggregationAverage`, `AggregationCount`, `AggregationMaximum`, `AggregationMinimum`, `AggregationTotal`.

#### Filter

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Filter("tagName eq 'value'")
```

Define a filter restricting the metrics returned.

#### Interval

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Interval("PT5M")
```

Define the ISO8601 duration setting the time grain of the returned data points. Note: Azure may not support all possible time durations.

#### SinglePoint

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.SinglePoint(true)
```

Return a time series with a single data point for each metrics. Equivalent to an interval the size of the timerange.

#### FlattenMetrics

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.FlattenMetrics(true)
```

Only applies when `SinglePoint` is enabled. Flattens multiple metrics on individual resources into a single time series per resource and per unique set of metadata. Mainly intended for tables to display multiple metrics for a single resource in a single row.

#### Top

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.Top(10)
```

Limit the number of records per resourceID returned. Only applies when a `Filter` is provided.

#### OrderBy

```golang
import metricsbatchquery "github.com/perses/plugins/azure/sdk/go/query/azure-metrics-batch-query"

metricsbatchquery.OrderBy("sum asc")
```

Define how to order results.

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
