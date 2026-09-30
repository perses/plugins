# ClickHouse Log Query Go SDK

## Constructor

```golang
import log "github.com/perses/plugins/clickhouse/sdk/go/query/log"

var options []log.Option
log.ClickHouseLogQuery("SELECT timestamp, level, message FROM logs WHERE level = 'ERROR' ORDER BY timestamp DESC", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import log "github.com/perses/plugins/clickhouse/sdk/go/query/log"

log.Query("SELECT timestamp, level, message, service FROM application_logs WHERE level IN ('ERROR', 'WARN')")
```

Define the SQL query expression.

#### Datasource

```golang
import log "github.com/perses/plugins/clickhouse/sdk/go/query/log"

log.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	log "github.com/perses/plugins/clickhouse/sdk/go/query/log"
	logstable "github.com/perses/plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("ClickHouse Logs Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Error Logs",
				logstable.LogsTable(),
				panel.AddQuery(
					log.ClickHouseLogQuery(`
						SELECT 
							timestamp,
							level,
							message,
							service
						FROM application_logs 
						WHERE level = 'ERROR'
						AND timestamp >= now() - INTERVAL 1 HOUR
						ORDER BY timestamp DESC
						LIMIT 1000
					`),
				),
			),
		),
	)
}```
```
