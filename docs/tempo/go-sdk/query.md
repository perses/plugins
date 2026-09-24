# Tempo Query Builder

## Constructor

```golang
import query "github.com/perses/plugins/tempo/sdk/go/query"

var options []query.Option
query.TraceQL("abc123def456", options...)
```

Need to provide the trace ID and a list of options.

## Default options

- [Expr()](#expr): with the TraceQL expression provided in the constructor.

## Available options

#### Expr

```golang
import query "github.com/perses/plugins/tempo/sdk/go/query"

query.Expr("{ .http.status_code = 200 }")
```

Define the TraceQL expression to query.

#### Datasource

```golang
import query "github.com/perses/plugins/tempo/sdk/go/query"

query.Datasource("MySuperTempoDatasource")
```

Define the datasource the query will use.

#### Limit

```golang
import query "github.com/perses/plugins/tempo/sdk/go/query"

query.Limit(100)
```

Limit the number of traces returned by the query.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	query "github.com/perses/plugins/tempo/sdk/go/query"
	tracetable "github.com/perses/plugins/tracetable/sdk/go"
)

func main() {
	dashboard.New("Tempo Dashboard",
		dashboard.AddPanelGroup("Trace Analysis",
			panelgroup.AddPanel("Trace Details",
				tracetable.Chart(),
				panel.AddQuery(
					query.TraceQL("{ .http.status_code = 200 }"),
				),
			),
		),
	)
}
```
