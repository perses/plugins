# Pyroscope Query Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/query"

var options []query.Option
query.ProfileQuery("cpu", `{service_name="api"}`, options...)
```

Need to provide the profile type, query expression and a list of options.

## Default options

- [ProfileType()](#profiletype): with the profile type provided in the constructor.
- [Query()](#query): with the expression provided in the constructor.

## Available options

#### ProfileType

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/query"

query.ProfileType("memory")
```

Define the profile type to query.

#### Query

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/query"

query.Query(`{service_name="api", environment="prod"}`)
```

Define the query expression using label selectors.

#### Datasource

```golang
import "github.com/perses/perses-plugins/pyroscope/sdk/go/v1/query"

query.Datasource("MyPyroscopeDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/perses-plugins/pyroscope/sdk/go/v1/query"
	flamechart "github.com/perses/perses-plugins/flamechart/sdk/go"
)

func main() {
	dashboard.New("Pyroscope Dashboard",
		dashboard.AddPanelGroup("CPU Profiling",
			panelgroup.AddPanel("API CPU Profile",
				flamechart.Panel(),
				panel.AddQuery(
					query.ProfileQuery("cpu", `{service_name="api", environment="production"}`),
				),
			),
		),
	)
}
```
