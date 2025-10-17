# TraceTable Go SDK

## Constructor

```golang
package main

import tracetable "github.com/perses/plugins/tracetable/sdk/go"

tracetable.Chart()
```

The TraceTable plugin has a simple constructor with no configurable options.

## Default options

- None

## Available options

- None (this plugin currently has no configurable options)

## Example

```golang
package main

import (
	"github.com/perses/perses/go-sdk/dashboard"
	"github.com/perses/perses/go-sdk/panel"
	tracetable "github.com/perses/plugins/tracetable/sdk/go"
)

func main() {
	dashboard.New("Trace Table Dashboard",
		dashboard.AddPanel("Trace Analysis",
			panel.New(
				tracetable.Chart(),
			),
		),
	)
}```
```
