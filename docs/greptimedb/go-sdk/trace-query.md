# GreptimeDB Trace Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/trace"

var options []trace.Option
trace.GreptimeDBTraceQuery("SELECT * FROM public.opentelemetry_traces LIMIT 100", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/trace"

trace.Query("SELECT * FROM public.opentelemetry_traces WHERE trace_id = 'abc123' ORDER BY timestamp ASC")
```

Define the SQL query expression.

#### Datasource

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/trace"

trace.Datasource("MyGreptimeDBDatasource")
```

Define the datasource the query will use.

## Example

### Trace Table

Use a trace list SQL query with the [Trace Table](../../tracetable/README.md) panel:

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/greptimedb/sdk/go/query/trace"
	tracetable "github.com/perses/plugins/tracetable/sdk/go"
)

func main() {
	dashboard.New("GreptimeDB Traces Dashboard",
		dashboard.AddPanelGroup("Trace search",
			panelgroup.AddPanel("Trace list",
				tracetable.Chart(),
				panel.AddQuery(
					trace.GreptimeDBTraceQuery("SELECT * FROM public.opentelemetry_traces LIMIT 100"),
				),
			),
		),
	)
}
```

### Tracing Gantt Chart

Use a trace detail SQL query (with a `trace_id` filter) with the [Tracing Gantt Chart](../../tracingganttchart/README.md) panel:

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/greptimedb/sdk/go/query/trace"
	tracinggantt "github.com/perses/plugins/tracingganttchart/sdk/go"
)

func main() {
	dashboard.New("GreptimeDB Trace Timeline Dashboard",
		dashboard.AddPanelGroup("Trace details",
			panelgroup.AddPanel("Trace timeline",
				tracinggantt.Chart(),
				panel.AddQuery(
					trace.GreptimeDBTraceQuery(`
						SELECT * FROM public.opentelemetry_traces
						WHERE trace_id = 'abc123abc123abc123abc123abc123ab'
						ORDER BY timestamp ASC
					`),
				),
			),
		),
	)
}
```
