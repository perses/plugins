# ClickHouse Time Series Query Go SDK

## Constructor

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

var options []timeseries.Option
timeseries.ClickHouseTimeSeriesQuery("SELECT toStartOfMinute(timestamp) as time, count() as requests FROM events GROUP BY time ORDER BY time", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

timeseries.Query("SELECT toStartOfHour(timestamp) as time, avg(response_time) FROM requests GROUP BY time ORDER BY time")
```

Define the SQL query expression.

#### Datasource

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

timeseries.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	clickhousequery "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"
	timeseries "github.com/perses/plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("ClickHouse Dashboard",
		dashboard.AddPanelGroup("Metrics",
			panelgroup.AddPanel("Request Rate",
				timeseries.Chart(),
				panel.AddQuery(
					clickhousequery.ClickHouseTimeSeriesQuery(`
						SELECT 
							toStartOfMinute(timestamp) as time,
							count() as requests
						FROM http_logs 
						WHERE timestamp >= now() - INTERVAL 1 HOUR
						GROUP BY time
						ORDER BY time
					`),
				),
			),
		),
	)
}```
```
