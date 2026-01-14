# VictoriaLogs Field Values Variable Go SDK

## Constructor

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/variable"

var options []variable.Option
variable.FieldValues("job", options...)
```

Need to provide the field name and a list of options.

## Default options

- [FieldName()](#fieldname): with the field name provided in the constructor.

## Available options

#### FieldName

```golang
import "github.com/perses/perses-plugins/victorialogs/sdk/go/v1/variable"

variable.FieldName("service")
```

Define the field name to extract values from.

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
		dashboard.AddVariable("job", variable.FieldValues("job")),
	)
}
```
