# VictoriaLogs Log Query Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/query"

var options []query.Option
query.LogQuery(`_stream:{job="nginx"} AND error`, options...)
```

Need to provide the LogsQL expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/query"

query.Query(`_stream:{service="api"} AND level:error`)
```

Define the LogsQL query expression for log data.

#### Datasource

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/query"

query.Datasource("MyVictoriaLogsDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/perses-plugins/victorialogs/sdk/go/v1/query"
	logstable "github.com/perses/perses-plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("VictoriaLogs Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Error Logs",
				logstable.Panel(),
				panel.AddQuery(
					query.LogQuery(`_stream:{job="nginx"} AND error`),
				),
			),
		),
	)
}
```
