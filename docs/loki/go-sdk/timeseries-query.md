# Loki Time Series Query Go SDK

## Constructor

```golang
import timeseries "github.com/perses/plugins/loki/sdk/go/query/time-series"

var options []timeseries.Option
timeseries.LokiTimeSeriesQuery(`rate({job="nginx"}[5m])`, options...)
```

Need to provide the LogQL expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import timeseries "github.com/perses/plugins/loki/sdk/go/query/time-series"

timeseries.Query(`sum(rate({job="nginx"}[5m])) by (instance)`)
```

Define the LogQL query expression for time series data.

#### Datasource

```golang
import timeseries "github.com/perses/plugins/loki/sdk/go/query/time-series"

timeseries.Datasource("MyLokiDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	lokiquery "github.com/perses/plugins/loki/sdk/go/query/time-series"
	timeseries "github.com/perses/plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("Loki Metrics Dashboard",
		dashboard.AddPanelGroup("Log Metrics",
			panelgroup.AddPanel("Request Rate",
				timeseries.Chart(),
				panel.AddQuery(
					lokiquery.LokiTimeSeriesQuery(`rate({job="nginx"}[5m])`),
				),
			),
		),
	)
}
```
