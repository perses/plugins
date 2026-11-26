# ClickHouse Time Series Query Go SDK

## Constructor

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

var options []timeseries.Option
timeseries.ClickHouseTimeSeriesQuery("SELECT $__timeInterval(Timestamp) AS time, count() AS requests FROM otel_traces WHERE $__timeFilter(Timestamp) GROUP BY time ORDER BY time", options...)
```

Need to provide the SQL query expression and a list of options. See [Writing time series queries](../queries.md#time-series-queries).

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

timeseries.Query("SELECT $__timeInterval(Timestamp) AS time, avg(Duration) AS duration FROM otel_traces WHERE $__timeFilter(Timestamp) GROUP BY time ORDER BY time")
```

Define the SQL query expression.

#### Datasource

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

timeseries.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

#### SeriesNameFormat

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

timeseries.SeriesNameFormat("{{ServiceName}} - {{SpanName}}")
```

Define the format of the names of the series. Each `{{label}}` is replaced by the value of the label of the series.

#### ExemplarQuery

```golang
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

timeseries.ExemplarQuery("SELECT Timestamp AS time, Duration / 1e6 AS value, ServiceName, TraceId AS trace_id FROM otel_traces WHERE $__timeFilter(Timestamp) ORDER BY Duration DESC LIMIT 100")
```

Define the SQL query expression returning the exemplars of the series.

#### MinStep

```golang
import "time"
import timeseries "github.com/perses/plugins/clickhouse/sdk/go/query/time-series"

timeseries.MinStep(time.Minute)
```

Define the lower bound of the interval of the query, which is the value of the `$__interval_s` family of macros. See [Min step](../queries.md#min-step).

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
							$__timeInterval(Timestamp) AS time,
							ServiceName,
							count() / $__interval_s AS rps
						FROM otel_traces
						WHERE $__timeFilter(Timestamp) AND SpanKind = 'Server'
						GROUP BY time, ServiceName
						ORDER BY time
					`, clickhousequery.SeriesNameFormat("{{ServiceName}}")),
				),
			),
		),
	)
}
```
