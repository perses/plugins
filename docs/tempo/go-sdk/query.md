# Tempo Query Builder

## Constructor

```golang
import "github.com/perses/perses-plugins/tempo/sdk/go/v1/query"

var options []query.Option
query.TraceQuery("abc123def456", options...)
```

Need to provide the trace ID and a list of options.

## Default options

- [TraceID()](#traceid): with the trace ID provided in the constructor.

## Available options

#### TraceID

```golang
import "github.com/perses/perses-plugins/tempo/sdk/go/v1/query"

query.TraceID("abc123def456789")
```

Define trace ID to query.

#### Datasource

```golang
import "github.com/perses/perses-plugins/tempo/sdk/go/v1/query"

query.Datasource("MySuperTempoDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/perses-plugins/tempo/sdk/go/v1/query"
	tracetable "github.com/perses/plugins/tracetable/sdk/go"
)

func main() {
	dashboard.New("Tempo Dashboard",
		dashboard.AddPanelGroup("Trace Analysis",
			panelgroup.AddPanel("Trace Details",
				tracetable.Chart(),
				panel.AddQuery(
					query.TraceQuery("abc123def456789"),
				),
			),
		),
	)
}
```
