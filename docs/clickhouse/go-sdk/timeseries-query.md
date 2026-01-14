# ClickHouse Time Series Query Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/query"

var options []query.Option
query.TimeSeriesQuery("SELECT toStartOfMinute(timestamp) as time, count() as requests FROM events GROUP BY time ORDER BY time", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/query"

query.Query("SELECT toStartOfHour(timestamp) as time, avg(response_time) FROM requests GROUP BY time ORDER BY time")
```

Define the SQL query expression.

#### Datasource

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/query"

query.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

#### Format

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/query"

query.Format("JSONEachRow")
```

Define the output format for the query results.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/perses-plugins/clickhouse/sdk/go/v1/query"
	timeseries "github.com/perses/perses-plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("ClickHouse Dashboard",
		dashboard.AddPanelGroup("Metrics",
			panelgroup.AddPanel("Request Rate",
				timeseries.Chart(),
				panel.AddQuery(
					query.TimeSeriesQuery(`
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
