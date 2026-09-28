# Pyroscope Query Go SDK

## Constructor

```golang
import query "github.com/perses/plugins/pyroscope/sdk/go/query"

var options []query.Option
query.ProfileQL(options...)
```

Provide profile query options with `ProfileQL`.

## Default options

- [ProfileType()](#profiletype): the profile type to query.

## Available options

#### ProfileType

```golang
import query "github.com/perses/plugins/pyroscope/sdk/go/query"

query.ProfileType("memory")
```

Define the profile type to query.

#### Query

```golang
import query "github.com/perses/plugins/pyroscope/sdk/go/query"

query.MaxNodes(1000)
```

Limit the number of profile nodes returned.

#### Datasource

```golang
import query "github.com/perses/plugins/pyroscope/sdk/go/query"

query.Datasource("MyPyroscopeDatasource")
```

Define the datasource the query will use.

#### Filters

```golang
import query "github.com/perses/plugins/pyroscope/sdk/go/query"

query.Filters([]query.LabelFilter{{}})
```

Define label filters for the profile query.

#### Service

```golang
import query "github.com/perses/plugins/pyroscope/sdk/go/query"

query.Service("api")
```

Set the service to query.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	query "github.com/perses/plugins/pyroscope/sdk/go/query"
	flamechart "github.com/perses/plugins/flamechart/sdk/go"
)

func main() {
	dashboard.New("Pyroscope Dashboard",
		dashboard.AddPanelGroup("CPU Profiling",
			panelgroup.AddPanel("API CPU Profile",
				flamechart.Chart(),
				panel.AddQuery(
					query.ProfileQL(
						query.ProfileType("cpu"),
						query.Service("api"),
					),
				),
			),
		),
	)
}
```
