# Trino Log Query Go SDK

## Constructor

```golang
import log "github.com/perses/plugins/trino/sdk/go/query/log"

var options []log.Option
log.TrinoLogQuery("SELECT event_time AS timestamp, level, message FROM app_logs ORDER BY event_time DESC LIMIT 1000", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import log "github.com/perses/plugins/trino/sdk/go/query/log"

log.Query("SELECT event_time AS timestamp, level, message FROM app_logs ORDER BY event_time DESC LIMIT 1000")
```

Define the SQL query expression.

#### Datasource

```golang
import log "github.com/perses/plugins/trino/sdk/go/query/log"

log.Datasource("MyTrinoDatasource")
```

Define the datasource the query will use.

#### Catalog and Schema

```golang
import log "github.com/perses/plugins/trino/sdk/go/query/log"

log.Catalog("iceberg")
log.Schema("analytics")
```

Set the catalog and schema sent as `X-Trino-Catalog` and `X-Trino-Schema`.

#### Session Properties

```golang
import log "github.com/perses/plugins/trino/sdk/go/query/log"

log.SessionProperties("query_max_run_time=5m")
```

Set `name=value` session properties, separated by commas or line breaks, sent as `X-Trino-Session`.

#### Source

```golang
import log "github.com/perses/plugins/trino/sdk/go/query/log"

log.Source("perses")
```

Set the source label sent as `X-Trino-Source`.

#### Routing Group

```golang
import log "github.com/perses/plugins/trino/sdk/go/query/log"

log.RoutingGroup("adhoc")
```

Set the routing group sent as `X-Trino-Routing-Group`, used by Trino Gateway.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	trinoquery "github.com/perses/plugins/trino/sdk/go/query/log"
	logstable "github.com/perses/plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("Trino Dashboard",
		dashboard.AddPanelGroup("Logs",
			panelgroup.AddPanel("Application logs",
				logstable.LogsTable(),
				panel.AddQuery(
					trinoquery.TrinoLogQuery(`
						SELECT event_time AS timestamp, level, message
						FROM app_logs
						WHERE event_time >= TIMESTAMP '{start}'
						ORDER BY event_time DESC
						LIMIT 1000
					`, trinoquery.Catalog("iceberg"), trinoquery.Schema("analytics")),
				),
			),
		),
	)
}
```
