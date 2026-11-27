# ClickHouse Profile Query Go SDK

## Constructor

```golang
import profile "github.com/perses/plugins/clickhouse/sdk/go/query/profile"

var options []profile.Option
profile.ClickHouseProfileQuery("SELECT Timestamp AS time, FunctionNames AS stack, length(TimestampsUnixNano) AS value FROM otel_profiles WHERE $__timeFilter(Timestamp)", options...)
```

Need to provide the SQL query expression and a list of options. See [Writing profile queries](../queries.md#profile-queries).

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import profile "github.com/perses/plugins/clickhouse/sdk/go/query/profile"

profile.Query("SELECT FunctionNames AS stack FROM otel_profiles WHERE $__timeFilter(Timestamp) AND ServiceName = 'checkout'")
```

Define the SQL query expression.

#### Datasource

```golang
import profile "github.com/perses/plugins/clickhouse/sdk/go/query/profile"

profile.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	panelgroup "github.com/perses/perses/go-sdk/panel-group"
	profile "github.com/perses/plugins/clickhouse/sdk/go/query/profile"
	flamechart "github.com/perses/plugins/flamechart/sdk/go"
)

func main() {
	dashboard.New("ClickHouse Profiles Dashboard",
		dashboard.AddPanelGroup("Profiles",
			panelgroup.AddPanel("CPU of the checkout service",
				flamechart.Chart(),
				panel.AddQuery(
					profile.ClickHouseProfileQuery(`
						SELECT
							Timestamp AS time,
							arrayMap((name, file) -> if(name != '', name, file), FunctionNames, MappingFileNames) AS stack,
							length(TimestampsUnixNano) AS value
						FROM otel_profiles
						WHERE $__timeFilter(Timestamp) AND ServiceName = 'checkout'
					`),
				),
			),
		),
	)
}
```
