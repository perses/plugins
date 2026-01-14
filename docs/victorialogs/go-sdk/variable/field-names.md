# VictoriaLogs Field Names Variable Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/variable"

var options []variable.Option
variable.FieldNames(options...)
```

Need a list of options.

## Default options

- None

## Available options

#### Datasource

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/variable"

variable.Datasource("MyVictoriaLogsDatasource")
```

Define the datasource the variable will use.

#### Query

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/variable"

variable.Query(`_stream:{environment="production"}`)
```

Define an optional LogsQL query to filter the results.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses-plugins/victorialogs/sdk/go/v1/variable"
)

func main() {
	dashboard.New("VictoriaLogs Dashboard",
		dashboard.AddVariable("available_fields", variable.FieldNames()),
	)
}
```
