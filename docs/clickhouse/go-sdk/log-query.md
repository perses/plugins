# ClickHouse Log Query Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/query"

var options []query.Option
query.LogQuery("SELECT timestamp, level, message FROM logs WHERE level = 'ERROR' ORDER BY timestamp DESC", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/perses-plugins/clickhouse/sdk/go/v1/query"

query.Query("SELECT timestamp, level, message, service FROM application_logs WHERE level IN ('ERROR', 'WARN')")
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
	logstable "github.com/perses/perses-plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("ClickHouse Logs Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Error Logs",
				logstable.Panel(),
				panel.AddQuery(
					query.LogQuery(`
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
