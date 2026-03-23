# DatasourceVariable Go SDK

## Constructor

```golang
package main

import datasourcevariable "github.com/perses/plugins/datasourcevariable/sdk/go"

var options []datasourcevariable.Option
datasourcevariable.Datasource("PrometheusDatasource", options...)
```

Need a datasource plugin kind and a list of options.

## Default options

- None

## Available options

### DatasourcePluginKind

```golang
import datasourcevariable "github.com/perses/plugins/datasourcevariable/sdk/go"

datasourcevariable.DatasourcePluginKind("PrometheusDatasource")
```

Define the kind of datasource plugin that this variable should reference. Common values include:
- `"PrometheusDatasource"`
- `"TempoDatasource"`
- `"LokiDatasource"`
- `"PyroscopeDatasource"`
- `"ClickHouseDatasource"`
- `"VictoriaLogsDatasource"`

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/variable"
	datasourcevariable "github.com/perses/plugins/datasourcevariable/sdk/go"
)

func main() {
	dashboard.New("Example Dashboard",
		dashboard.AddVariable("datasource",
			variable.List(
				datasourcevariable.Datasource("PrometheusDatasource"),
			),
		),
	)
}
```
