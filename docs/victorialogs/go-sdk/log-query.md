# VictoriaLogs Log Query Go SDK

## Constructor

```golang
import log "github.com/perses/plugins/victorialogs/sdk/go/query/log"

var options []log.Option
log.VictoriaLogsLogQuery(`_stream:{job="nginx"} AND error`, options...)
```

Need to provide the LogsQL expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import log "github.com/perses/plugins/victorialogs/sdk/go/query/log"

log.Query(`_stream:{service="api"} AND level:error`)
```

Define the LogsQL query expression for log data.

#### Datasource

```golang
import log "github.com/perses/plugins/victorialogs/sdk/go/query/log"

log.Datasource("MyVictoriaLogsDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	log "github.com/perses/plugins/victorialogs/sdk/go/query/log"
	logstable "github.com/perses/plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("VictoriaLogs Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Error Logs",
				logstable.LogsTable(),
				panel.AddQuery(
					log.VictoriaLogsLogQuery(`_stream:{job="nginx"} AND error`),
				),
			),
		),
	)
}
```
