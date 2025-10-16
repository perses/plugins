# Prometheus Query Builder

## Constructor

```golang
import "github.com/perses/plugins/prometheus/sdk/go/query"

var options []query.Option
query.PromQL("max by (container) (container_memory_rss{})", options...)
```

Need to provide the PromQL expression and a list of options.

## Default options

- [Expr()](#expr): with the expression provided in the constructor.

## Available options

#### Expr

```golang
import "github.com/perses/plugins/prometheus/sdk/go/query"

query.Expr("max by (container) (container_memory_rss{})")
```

Define query expression.

#### Datasource

```golang
import "github.com/perses/plugins/prometheus/sdk/go/query"

query.Datasource("MySuperDatasource")
```

Define the datasource the query will use.

#### SeriesNameFormat

```golang
import "github.com/perses/plugins/prometheus/sdk/go/query"

query.SeriesNameFormat("{{label_name}}")
```

Define query series name format.

#### MinStep

```golang
import "time"
import "github.com/perses/plugins/prometheus/sdk/go/query"

query.MinStep(5*time.Minute)
```

Define query min step.

#### Resolution

```golang
import "github.com/perses/plugins/prometheus/sdk/go/query"

query.Resolution(3600)
```

Define query resolution.

## Example

```golang
package main

import (
	"time"

	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	"github.com/perses/plugins/prometheus/sdk/go/query"
	timeseries "github.com/perses/plugins/timeserieschart/sdk/go"
)

func main() {
	dashboard.New("Example Dashboard",
		dashboard.AddPanelGroup("Resource usage",
			panelgroup.AddPanel("Container memory",
				timeseries.Chart(),
				panel.AddQuery(
					query.PromQL("max by (container) (container_memory_rss{stack=\"$stack\",prometheus=\"$prometheus\",prometheus_namespace=\"$prometheus_namespace\",namespace=\"$namespace\",pod=\"$pod\",container=\"$container\"})",
						query.MinStep(time.Minute),
					),
				),
			),
		),
	)
}
```
