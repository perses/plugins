# ClickHouse Trace Query Go SDK

## Constructor

```golang
import trace "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

var options []trace.Option
trace.ClickHouseTraceQuery("SELECT TraceId, Timestamp FROM otel_traces WHERE $__timeFilter(Timestamp) AND StatusCode = 'Error'", options...)
```

Need to provide a trace ID, a variable holding one, or the SQL query expression of a search, and a list of options. See [Writing trace queries](../queries.md#trace-queries).

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import trace "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Query("$traceId")
```

Define the trace ID, or the SQL query expression of the search.

#### Datasource

```golang
import trace "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

#### Table

```golang
import trace "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Table("otel.otel_traces")
```

Define the table of the spans, in the schema of the ClickHouse exporter of the OpenTelemetry Collector: `table` or `database.table`. By default, it is `otel_traces`.

#### Limit

```golang
import trace "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Limit(50)
```

Limit the number of traces returned by a search. By default, it is 20.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	trace "github.com/perses/plugins/clickhouse/sdk/go/query/trace"
	tracetable "github.com/perses/plugins/tracetable/sdk/go"
)

func main() {
	dashboard.New("ClickHouse Traces Dashboard",
		dashboard.AddPanelGroup("Traces",
			panelgroup.AddPanel("Failed requests",
				tracetable.Chart(),
				panel.AddQuery(
					trace.ClickHouseTraceQuery(`
						SELECT TraceId, Timestamp
						FROM otel_traces
						WHERE $__timeFilter(Timestamp) AND StatusCode = 'Error'
					`, trace.Limit(50)),
				),
			),
		),
	)
}
```
