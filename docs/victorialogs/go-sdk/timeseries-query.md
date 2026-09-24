# VictoriaLogs Time Series Query Go SDK

## Constructor

```golang
import timeseries "github.com/perses/plugins/victorialogs/sdk/go/query/time-series"

var options []timeseries.Option
timeseries.VictoriaLogsTimeSeriesQuery(`_stream:{job="nginx"} | stats count() by (_time:1m)`, options...)
```

Need to provide the LogsQL expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import timeseries "github.com/perses/plugins/victorialogs/sdk/go/query/time-series"

timeseries.Query(`_stream:{service="api"} | stats sum(response_time) by (_time:5m)`)
```

Define the LogsQL query expression for time series data.

#### Datasource

```golang
import timeseries "github.com/perses/plugins/victorialogs/sdk/go/query/time-series"

timeseries.Datasource("MyVictoriaLogsDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	timeseriesquery "github.com/perses/plugins/victorialogs/sdk/go/query/time-series"
	timeseries "github.com/perses/plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("VictoriaLogs Dashboard",
		dashboard.AddPanelGroup("Log Metrics",
			panelgroup.AddPanel("Request Rate",
				timeseries.Chart(),
				panel.AddQuery(
					timeseriesquery.VictoriaLogsTimeSeriesQuery(`_stream:{job="nginx"} | stats count() by (_time:1m)`),
				),
			),
		),
	)
}
```
