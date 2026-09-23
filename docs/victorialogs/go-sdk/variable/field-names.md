# VictoriaLogs Field Names Variable Go SDK

## Constructor

```golang
import fieldnames "github.com/perses/plugins/victorialogs/sdk/go/variable/field-names"

var options []fieldnames.Option
fieldnames.VictoriaLogsFieldNames(options...)
```

Need a list of options.

## Default options

- None

## Available options

#### Datasource

```golang
import fieldnames "github.com/perses/plugins/victorialogs/sdk/go/variable/field-names"

fieldnames.Datasource("MyVictoriaLogsDatasource")
```

Define the datasource the variable will use.

#### Query

```golang
import fieldnames "github.com/perses/plugins/victorialogs/sdk/go/variable/field-names"

fieldnames.Query(`_stream:{environment="production"}`)
```

Define an optional LogsQL query to filter the results.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	fieldnames "github.com/perses/plugins/victorialogs/sdk/go/variable/field-names"
)

func main() {
	dashboard.New("VictoriaLogs Dashboard",
		dashboard.AddVariable("available_fields", fieldnames.VictoriaLogsFieldNames()),
	)
}
```
