# StaticListVariable Go SDK

## Constructor

```golang
package main

import staticlist "github.com/perses/plugins/staticlistvariable/sdk/go"

var options []staticlist.Option
staticlist.StaticList(options...)
```

Need a list of options.

## Default options

- None

## Available options

### Values

```golang
package main

import staticlist "github.com/perses/plugins/staticlistvariable/sdk/go"

staticlist.Values("production", "staging", "development")
```

Set the complete list of static values for the variable. This replaces any existing values.

### AddValue

```golang
package main

import staticlist "github.com/perses/plugins/staticlistvariable/sdk/go"

staticlist.AddValue("new-environment")
```

Add a single value to the existing list of static values.

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/variable"
	staticlist "github.com/perses/plugins/staticlistvariable/sdk/go"
)

func main() {
	dashboard.New("Environment Dashboard",
		dashboard.AddVariable("environment",
			variable.List(
				staticlist.StaticList(
					staticlist.Values("production", "staging", "development"),
					staticlist.AddValue("testing"),
				),
			),
		),
	)
}```
```
