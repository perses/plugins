# GreptimeDB Time Series Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/time-series"

var options []timeseries.Option
timeseries.GreptimeDBTimeSeriesQuery(`
  SELECT time_window, loc,
      max(max_temp) RANGE '1m' FILL LINEAR AS max_temp
    FROM public.temp_alerts
    WHERE time_window >= to_timestamp_millis(${__from})
      AND time_window <= to_timestamp_millis(${__to})
    ALIGN '30s' BY (loc)
    ORDER BY time_window ASC
    LIMIT 2000
`, options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/time-series"

timeseries.Query(`
  SELECT time_window, loc,
      max(max_temp) RANGE '1m' FILL LINEAR AS max_temp
    FROM public.temp_alerts
    WHERE time_window >= to_timestamp_millis(${__from})
      AND time_window <= to_timestamp_millis(${__to})
    ALIGN '30s' BY (loc)
    ORDER BY time_window ASC
    LIMIT 2000
`)
```

Define the SQL query expression. `${__from}` and `${__to}` are replaced when the dashboard runs in Perses.

#### Datasource

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/time-series"

timeseries.Datasource("MyGreptimeDBDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/greptimedb/sdk/go/query/time-series"
	tsChart "github.com/perses/plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("GreptimeDB Dashboard",
		dashboard.AddPanelGroup("Metrics",
			panelgroup.AddPanel("Max temperature",
				tsChart.Chart(),
				panel.AddQuery(
					timeseries.GreptimeDBTimeSeriesQuery(`
						SELECT time_window, loc,
						    max(max_temp) RANGE '1m' FILL LINEAR AS max_temp
						  FROM public.temp_alerts
						  WHERE time_window >= to_timestamp_millis(${__from})
						    AND time_window <= to_timestamp_millis(${__to})
						  ALIGN '30s' BY (loc)
						  ORDER BY time_window ASC
						  LIMIT 2000
					`),
				),
			),
		),
	)
}
```
