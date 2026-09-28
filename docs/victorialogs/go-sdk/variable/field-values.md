# VictoriaLogs Field Values Variable Go SDK

## Constructor

```golang
import fieldvalues "github.com/perses/plugins/victorialogs/sdk/go/variable/field-values"

var options []fieldvalues.Option
fieldvalues.VictoriaLogsFieldValues("job", options...)
```

Need to provide the field name and a list of options.

## Default options

- [Field()](#field): with the field name provided in the constructor.

## Available options

#### Field

```golang
import fieldvalues "github.com/perses/plugins/victorialogs/sdk/go/variable/field-values"

fieldvalues.Field("service")
```

Define the field name to extract values from.

#### Datasource

```golang
import fieldvalues "github.com/perses/plugins/victorialogs/sdk/go/variable/field-values"

fieldvalues.Datasource("MyVictoriaLogsDatasource")
```

Define the datasource the variable will use.

#### Query

```golang
import fieldvalues "github.com/perses/plugins/victorialogs/sdk/go/variable/field-values"

fieldvalues.Query(`_stream:{environment="production"}`)
```

Define an optional LogsQL query to filter the results.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	fieldvalues "github.com/perses/plugins/victorialogs/sdk/go/variable/field-values"
)

func main() {
	dashboard.New("VictoriaLogs Dashboard",
		dashboard.AddVariable("job", fieldvalues.VictoriaLogsFieldValues("job")),
	)
}
```
