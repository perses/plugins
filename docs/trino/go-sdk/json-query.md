# Trino JSON Query Go SDK

## Constructor

```golang
import jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"

var options []jsonquery.Option
jsonquery.TrinoJsonQuery("SELECT host_id, hostname, region FROM iceberg.ops.hosts ORDER BY region", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"

jsonquery.Query("SELECT host_id, hostname, region FROM iceberg.ops.hosts ORDER BY region")
```

Define the SQL query expression.

#### Datasource

```golang
import jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"

jsonquery.Datasource("MyTrinoDatasource")
```

Define the datasource the query will use.

#### Catalog and Schema

```golang
import jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"

jsonquery.Catalog("iceberg")
jsonquery.Schema("analytics")
```

Set the catalog and schema sent as `X-Trino-Catalog` and `X-Trino-Schema`.

#### Session Properties

```golang
import jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"

jsonquery.SessionProperties("query_max_run_time=5m")
```

Set `name=value` session properties, separated by commas or line breaks, sent as `X-Trino-Session`.

#### Source

```golang
import jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"

jsonquery.Source("perses")
```

Set the source label sent as `X-Trino-Source`.

#### Routing Group

```golang
import jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"

jsonquery.RoutingGroup("adhoc")
```

Set the routing group sent as `X-Trino-Routing-Group`, used by Trino Gateway.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	table "github.com/perses/plugins/table/sdk/go"
	jsonquery "github.com/perses/plugins/trino/sdk/go/query/json"
)

func main() {
	dashboard.New("Trino Dashboard",
		dashboard.AddPanelGroup("Tables",
			panelgroup.AddPanel("Services with the most errors",
				table.Table(),
				panel.AddQuery(
					jsonquery.TrinoJsonQuery(`
						SELECT
						  service_name,
						  count(*) AS spans,
						  count_if(status_code = 'ERROR') AS errors
						FROM iceberg.otel.spans
						WHERE start_time > current_timestamp - INTERVAL '1' HOUR
						GROUP BY service_name
						ORDER BY errors DESC
						LIMIT 10
					`, jsonquery.Datasource("MyTrinoDatasource")),
				),
			),
		),
	)
}
```
