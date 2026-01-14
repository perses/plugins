# Loki Time Series Query Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

var options []query.Option
query.TimeSeriesQuery(`rate({job="nginx"}[5m])`, options...)
```

Need to provide the LogQL expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

query.Query(`sum(rate({job="nginx"}[5m])) by (instance)`)
```

Define the LogQL query expression for time series data.

#### Datasource

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

query.Datasource("MyLokiDatasource")
```

Define the datasource the query will use.

#### Format

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

query.Format("time_series")
```

Define the output format for the query results.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/perses-plugins/loki/sdk/go/v1/query"
	timeseries "github.com/perses/perses-plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("Loki Metrics Dashboard",
		dashboard.AddPanelGroup("Log Metrics",
			panelgroup.AddPanel("Request Rate",
				timeseries.Chart(),
				panel.AddQuery(
					query.TimeSeriesQuery(`rate({job="nginx"}[5m])`),
				),
			),
		),
	)
}
```
