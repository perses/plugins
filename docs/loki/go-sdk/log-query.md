# Loki Log Query Go SDK

## Constructor

```golang
import log "github.com/perses/plugins/loki/sdk/go/query/log"

var options []log.Option
log.LokiLogQuery(`{job="nginx"} |= "error"`, options...)
```

Need to provide the LogQL expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import log "github.com/perses/plugins/loki/sdk/go/query/log"

log.Query(`{job="nginx", level="error"} |~ "database|connection"`)
```

Define the LogQL query expression for log data.

#### Datasource

```golang
import log "github.com/perses/plugins/loki/sdk/go/query/log"

log.Datasource("MyLokiDatasource")
```

Define the datasource the query will use.

#### Direction

```golang
import log "github.com/perses/plugins/loki/sdk/go/query/log"

log.SetDirection(log.ForwardDirection)
log.Forward()
log.Backward()
```

Set the log direction. Use `SetDirection` with `ForwardDirection` or `BackwardDirection`, or use the `Forward` and `Backward` helpers.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	log "github.com/perses/plugins/loki/sdk/go/query/log"
	logstable "github.com/perses/plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("Loki Logs Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Error Logs",
				logstable.LogsTable(),
				panel.AddQuery(
					log.LokiLogQuery(`{job="nginx"} |= "error"`),
				),
			),
		),
	)
}
```
