# CloudWatch Time Series Query Builder

## Constructor

```golang
import timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"

var options []timeseries.Option
timeseries.CloudWatchTimeSeriesQuery(options...)
```

The queries are added with the options, in order. Expressions can reference the queries added before them by ID.

## Default options

- None

## Available options

#### Datasource

```golang
import timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"

timeseries.Datasource("cloudwatch")
```

Define the datasource the query will use. Without it, the default CloudWatch datasource is used.

#### Metric

```golang
import timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"

timeseries.Metric("m1", timeseries.MetricStat{
	Namespace:  "AWS/EC2",
	Name:       "CPUUtilization",
	Dimensions: map[string]string{"InstanceId": "$instance"},
	Statistic:  "Average",
	Period:     60,
})
```

Add a query returning a metric. The period is a minimum in seconds, a multiple of 60.

#### Expression

```golang
import timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"

timeseries.Expression("e1", "m1 * 2")
```

Add a metric math query, referencing the other queries by ID.

#### Label

```golang
import timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"

timeseries.Label("CPU x2")
```

Set the legend of the last added query.

#### Hidden

```golang
import timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"

timeseries.Hidden()
```

Hide the series of the last added query, for example when it is only used by an expression.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"

	timeseries "github.com/perses/plugins/cloudwatch/sdk/go/query/time-series"
)

func main() {
	dashboard.New("CloudWatch Dashboard",
		dashboard.AddPanelGroup("EC2",
			panelgroup.AddPanel("CPU",
				panel.AddQuery(timeseries.CloudWatchTimeSeriesQuery(
					timeseries.Datasource("cloudwatch"),
					timeseries.Metric("m1", timeseries.MetricStat{
						Namespace: "AWS/EC2",
						Name:      "CPUUtilization",
						Statistic: "Average",
						Period:    60,
					}),
					timeseries.Hidden(),
					timeseries.Expression("e1", "m1 * 2"),
					timeseries.Label("CPU x2"),
				)),
			),
		),
	)
}
```
