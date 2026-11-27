# ClickHouse SQL Annotation Go SDK

## Constructor

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/annotation/sql"

var options []sql.Option
sql.ClickHouseSQL("SELECT deployed_at AS time, version AS title FROM deployments WHERE $__timeFilter(deployed_at)", options...)
```

Need to provide the SQL query expression and a list of options. See [Writing annotation queries](../queries.md#annotation-queries).

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/annotation/sql"

sql.Query("SELECT started AS start, finished AS end, name AS title FROM maintenances WHERE $__timeFilter(started)")
```

Define the SQL query expression.

#### Datasource

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/annotation/sql"

sql.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/annotation"
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/plugins/clickhouse/sdk/go/annotation/sql"
)

func main() {
	dashboard.New("ClickHouse Dashboard",
		dashboard.AddAnnotation("Deployments",
			sql.ClickHouseSQL("SELECT deployed_at AS time, version AS title, service FROM deployments WHERE $__timeFilter(deployed_at)"),
			annotation.Color("#1f77b4"),
		),
	)
}
```
