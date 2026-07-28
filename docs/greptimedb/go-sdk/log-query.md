# GreptimeDB Log Query Go SDK

## Constructor

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/log"

var options []log.Option
log.GreptimeDBLogQuery("SELECT * FROM greptime.public.logs LIMIT 100", options...)
```

Need to provide the SQL query expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/log"

log.Query("SELECT * FROM greptime.public.logs WHERE severity_text = 'ERROR' LIMIT 100")
```

Define the SQL query expression.

#### Datasource

```golang
import "github.com/perses/plugins/greptimedb/sdk/go/query/log"

log.Datasource("MyGreptimeDBDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/greptimedb/sdk/go/query/log"
	logstable "github.com/perses/plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("GreptimeDB Logs Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Recent logs",
				logstable.LogsTable(),
				panel.AddQuery(
					log.GreptimeDBLogQuery("SELECT * FROM greptime.public.logs LIMIT 100"),
				),
			),
		),
	)
}
```
