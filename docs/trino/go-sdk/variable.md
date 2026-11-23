# Trino SQL Variable Go SDK

## Constructor

```golang
import variable "github.com/perses/plugins/trino/sdk/go/variable"

var options []variable.Option
variable.TrinoSQL("SELECT DISTINCT region FROM iceberg.ops.hosts ORDER BY region", options...)
```

Need to provide the SQL query expression and a list of options. It returns a list variable option, to use with
`listvariable.List()`. The first column is the value and an optional second column is the display label.

## Default options

- [Query()](#query): with the expression provided in the constructor.

## Available options

#### Query

```golang
import variable "github.com/perses/plugins/trino/sdk/go/variable"

variable.Query("SELECT DISTINCT region FROM iceberg.ops.hosts ORDER BY region")
```

Define the SQL query expression.

#### Datasource

```golang
import variable "github.com/perses/plugins/trino/sdk/go/variable"

variable.Datasource("MyTrinoDatasource")
```

Define the datasource the query will use.

#### Catalog and Schema

```golang
import variable "github.com/perses/plugins/trino/sdk/go/variable"

variable.Catalog("iceberg")
variable.Schema("analytics")
```

Set the catalog and schema sent as `X-Trino-Catalog` and `X-Trino-Schema`.

#### Session Properties

```golang
import variable "github.com/perses/plugins/trino/sdk/go/variable"

variable.SessionProperties("query_max_run_time=5m")
```

Set `name=value` session properties, separated by commas or line breaks, sent as `X-Trino-Session`.

#### Source

```golang
import variable "github.com/perses/plugins/trino/sdk/go/variable"

variable.Source("perses")
```

Set the source label sent as `X-Trino-Source`.

#### Routing Group

```golang
import variable "github.com/perses/plugins/trino/sdk/go/variable"

variable.RoutingGroup("adhoc")
```

Set the routing group sent as `X-Trino-Routing-Group`, used by Trino Gateway.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	listvariable "github.com/perses/perses/go-sdk/variable/list-variable"
	trinovariable "github.com/perses/plugins/trino/sdk/go/variable"
)

func main() {
	dashboard.New("Trino Dashboard",
		dashboard.AddVariable("region", listvariable.List(
			trinovariable.TrinoSQL(
				"SELECT DISTINCT region FROM iceberg.ops.hosts WHERE region IS NOT NULL ORDER BY region",
				trinovariable.Datasource("MyTrinoDatasource"),
			),
			listvariable.AllowMultiple(true),
		)),
		dashboard.AddVariable("host", listvariable.List(
			trinovariable.TrinoSQL(`
				SELECT CAST(host_id AS varchar) AS value, concat(hostname, ' (', region, ')') AS label
				FROM iceberg.ops.hosts
				WHERE region IN (${region:sqlstring})
				ORDER BY label
			`, trinovariable.Datasource("MyTrinoDatasource")),
		)),
	)
}
```
