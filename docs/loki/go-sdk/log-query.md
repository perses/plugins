# Loki Log Query Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

var options []query.Option
query.LogQuery(`{job="nginx"} |= "error"`, options...)
```

Need to provide the LogQL expression and a list of options.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

query.Query(`{job="nginx", level="error"} |~ "database|connection"`)
```

Define the LogQL query expression for log data.

#### Datasource

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

query.Datasource("MyLokiDatasource")
```

Define the datasource the query will use.

#### Format

```golang
import "github.com/perses/perses-plugins/loki/sdk/go/v1/query"

query.Format("logs")
```

Define the output format for the query results.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/perses-plugins/loki/sdk/go/v1/query"
	logstable "github.com/perses/perses-plugins/logstable/sdk/go"
)

func main() {
	dashboard.New("Loki Logs Dashboard",
		dashboard.AddPanelGroup("Application Logs",
			panelgroup.AddPanel("Error Logs",
				logstable.Panel(),
				panel.AddQuery(
					query.LogQuery(`{job="nginx"} |= "error"`),
				),
			),
		),
	)
}
```
