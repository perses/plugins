# Trino Time Series Query Go SDK

## Constructor

```golang
import timeseries "github.com/perses/plugins/trino/sdk/go/query/time-series"

var options []timeseries.Option
timeseries.TrinoTimeSeriesQuery("SELECT date_trunc('minute', event_time) AS time, count(*) AS events FROM events GROUP BY 1 ORDER BY 1", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import timeseries "github.com/perses/plugins/trino/sdk/go/query/time-series"

timeseries.Query("SELECT date_trunc('minute', event_time) AS time, count(*) AS events FROM events GROUP BY 1 ORDER BY 1")
```

Define the SQL query expression.

#### Datasource

```golang
import timeseries "github.com/perses/plugins/trino/sdk/go/query/time-series"

timeseries.Datasource("MyTrinoDatasource")
```

Define the datasource the query will use.

#### Catalog and Schema

```golang
import timeseries "github.com/perses/plugins/trino/sdk/go/query/time-series"

timeseries.Catalog("iceberg")
timeseries.Schema("analytics")
```

Set the catalog and schema sent as `X-Trino-Catalog` and `X-Trino-Schema`.

#### Session Properties

```golang
import timeseries "github.com/perses/plugins/trino/sdk/go/query/time-series"

timeseries.SessionProperties("query_max_run_time=5m")
```

Set `name=value` session properties, separated by commas or line breaks, sent as `X-Trino-Session`.

#### Source

```golang
import timeseries "github.com/perses/plugins/trino/sdk/go/query/time-series"

timeseries.Source("perses")
```

Set the source label sent as `X-Trino-Source`.

#### Routing Group

```golang
import timeseries "github.com/perses/plugins/trino/sdk/go/query/time-series"

timeseries.RoutingGroup("adhoc")
```

Set the routing group sent as `X-Trino-Routing-Group`, used by Trino Gateway.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	trinoquery "github.com/perses/plugins/trino/sdk/go/query/time-series"
	timeseries "github.com/perses/plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("Trino Dashboard",
		dashboard.AddPanelGroup("Metrics",
			panelgroup.AddPanel("Events per minute",
				timeseries.Chart(),
				panel.AddQuery(
					trinoquery.TrinoTimeSeriesQuery(`
						SELECT
							date_trunc('minute', event_time) AS time,
							count(*) AS events
						FROM events
						WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
						GROUP BY 1
						ORDER BY 1
					`, trinoquery.Catalog("iceberg"), trinoquery.Schema("analytics")),
				),
			),
		),
	)
}
```
