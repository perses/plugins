# Trino Trace Query Go SDK

## Constructor

```golang
import trace "github.com/perses/plugins/trino/sdk/go/query/trace"

var options []trace.Option
trace.TrinoTraceQuery("SELECT lower(to_hex(trace_id)) AS trace_id, lower(to_hex(span_id)) AS span_id, service_name, start_time, end_time FROM iceberg.otel.spans", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import trace "github.com/perses/plugins/trino/sdk/go/query/trace"

trace.Query("SELECT lower(to_hex(trace_id)) AS trace_id, lower(to_hex(span_id)) AS span_id, service_name, start_time, end_time FROM iceberg.otel.spans")
```

Define the SQL query expression.

#### Datasource

```golang
import trace "github.com/perses/plugins/trino/sdk/go/query/trace"

trace.Datasource("MyTrinoDatasource")
```

Define the datasource the query will use.

#### Catalog and Schema

```golang
import trace "github.com/perses/plugins/trino/sdk/go/query/trace"

trace.Catalog("iceberg")
trace.Schema("analytics")
```

Set the catalog and schema sent as `X-Trino-Catalog` and `X-Trino-Schema`.

#### Session Properties

```golang
import trace "github.com/perses/plugins/trino/sdk/go/query/trace"

trace.SessionProperties("query_max_run_time=5m")
```

Set `name=value` session properties, separated by commas or line breaks, sent as `X-Trino-Session`.

#### Source

```golang
import trace "github.com/perses/plugins/trino/sdk/go/query/trace"

trace.Source("perses")
```

Set the source label sent as `X-Trino-Source`.

#### Routing Group

```golang
import trace "github.com/perses/plugins/trino/sdk/go/query/trace"

trace.RoutingGroup("adhoc")
```

Set the routing group sent as `X-Trino-Routing-Group`, used by Trino Gateway.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
	textvariable "github.com/perses/perses/go-sdk/variable/text-variable"
	tracetable "github.com/perses/plugins/tracetable/sdk/go"
	tracingganttchart "github.com/perses/plugins/tracingganttchart/sdk/go"
	trinoquery "github.com/perses/plugins/trino/sdk/go/query/trace"
	trinovariable "github.com/perses/plugins/trino/sdk/go/variable"
)

func main() {
	dashboard.New("Trino Traces",
		// The Trace panel reads $trace_id, which is set through this dashboard variable.
		dashboard.AddVariable("trace_id", textvariable.Text("")),
		dashboard.AddVariable("service", listvariable.List(
			trinovariable.TrinoSQL(
				"SELECT DISTINCT service_name FROM iceberg.otel.spans ORDER BY 1",
				trinovariable.Datasource("MyTrinoDatasource"),
			),
			listvariable.AllowMultiple(true),
		)),
		dashboard.AddPanelGroup("Traces",
			panelgroup.AddPanel("Recent traces",
				tracetable.Chart(),
				panel.AddQuery(
					trinoquery.TrinoTraceQuery(`
						WITH recent AS (
						  SELECT trace_id
						  FROM iceberg.otel.spans
						  WHERE service_name IN (${service:sqlstring})
						    AND start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
						  GROUP BY trace_id
						  ORDER BY max(start_time) DESC
						  LIMIT 100
						)
						SELECT
						  lower(to_hex(s.trace_id)) AS trace_id,
						  lower(to_hex(s.span_id)) AS span_id,
						  lower(to_hex(s.parent_span_id)) AS parent_span_id,
						  s.service_name,
						  s.name AS span_name,
						  s.start_time,
						  s.end_time,
						  s.status_code
						FROM iceberg.otel.spans s
						JOIN recent r ON s.trace_id = r.trace_id
						WHERE s.start_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'
						ORDER BY s.start_time DESC
					`, trinoquery.Datasource("MyTrinoDatasource")),
				),
			),
			panelgroup.AddPanel("Trace",
				tracingganttchart.Chart(),
				panel.AddQuery(
					trinoquery.TrinoTraceQuery(`
						SELECT
						  lower(to_hex(trace_id)) AS trace_id,
						  lower(to_hex(span_id)) AS span_id,
						  lower(to_hex(parent_span_id)) AS parent_span_id,
						  service_name,
						  name AS span_name,
						  start_time,
						  to_milliseconds(end_time - start_time) AS duration_ms,
						  status_code,
						  attributes
						FROM iceberg.otel.spans
						WHERE trace_id = from_hex(${trace_id:sqlstring})
						ORDER BY start_time
					`, trinoquery.Datasource("MyTrinoDatasource")),
				),
			),
		),
	)
}
```
