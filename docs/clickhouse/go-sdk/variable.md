# ClickHouse SQL Variable Go SDK

## Constructor

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/variable/sql"

var options []sql.Option
sql.ClickHouseSQL("SELECT DISTINCT ServiceName FROM otel_traces WHERE $__timeFilter(Timestamp) ORDER BY ServiceName", options...)
```

Need to provide the SQL query expression and a list of options. See [Writing variable queries](../queries.md#variable-queries).

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/variable/sql"

sql.Query("SELECT DISTINCT SpanName AS value FROM otel_traces WHERE ServiceName IN (${service:sqlstring})")
```

Define the SQL query expression.

#### Datasource

```golang
import "github.com/perses/plugins/clickhouse/sdk/go/variable/sql"

sql.Datasource("MyClickHouseDatasource")
```

Define the datasource the query will use.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
	"github.com/perses/plugins/clickhouse/sdk/go/variable/sql"
)

func main() {
	dashboard.New("ClickHouse Dashboard",
		dashboard.AddVariable("service",
			listvariable.List(
				sql.ClickHouseSQL("SELECT DISTINCT ServiceName FROM otel_traces WHERE $__timeFilter(Timestamp) ORDER BY ServiceName"),
				listvariable.AllowAllValue(true),
				listvariable.AllowMultiple(true),
			),
		),
	)
}
```
