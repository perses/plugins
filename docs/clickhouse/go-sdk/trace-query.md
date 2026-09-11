# ClickHouse Trace Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

var options []trace.Option
trace.ClickHouseTraceQuery("5b8efff798038103d269b633813fc60c", options...)
```

Need to provide a trace ID or a SQL query, and a list of options.

## Default options

- [Query()](#query): with the trace ID or the SQL query provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Query("$traceId")
```

Define the trace ID, or the SQL query returning one row per span.

#### Datasource

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

#### Table

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Table("otel.otel_traces")
```

Define the table read when looking up a trace by ID. Defaults to `otel_traces`.

#### Limit

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/query/trace"

trace.Limit(50)
```

Define the maximum number of traces returned by a search.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/clickhouse/sdk/go/query/trace"
	tracetable "github.com/perses/plugins/tracetable/sdk/go"
	tracingganttchart "github.com/perses/plugins/tracingganttchart/sdk/go"
)

func main() {
	dashboard.New("ClickHouse Traces Dashboard",
		dashboard.AddPanelGroup("Traces",
			panelgroup.AddPanel("Checkout traces",
				tracetable.Chart(),
				panel.AddQuery(
					trace.ClickHouseTraceQuery(`
						SELECT TraceId, ParentSpanId, SpanName, ServiceName, Timestamp, Duration, StatusCode
						FROM otel.otel_traces
						WHERE Timestamp BETWEEN '{start}' AND '{end}'
						AND TraceId IN (
							SELECT TraceId FROM otel.otel_traces
							WHERE ServiceName = 'checkout' AND Timestamp BETWEEN '{start}' AND '{end}'
						)
					`, trace.Limit(50)),
				),
			),
			panelgroup.AddPanel("Trace",
				tracingganttchart.Chart(),
				panel.AddQuery(
					trace.ClickHouseTraceQuery("$traceId", trace.Table("otel.otel_traces")),
				),
			),
		),
	)
}
```
