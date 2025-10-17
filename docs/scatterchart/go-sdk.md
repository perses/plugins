# ScatterChart Go SDK

## Constructor

```golang
package main

import scatter "github.com/perses/plugins/scatterchart/sdk/go"

scatter.Chart()
```

The ScatterChart plugin has a simple constructor with no configurable options.

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
	scatter "github.com/perses/plugins/scatterchart/sdk/go"
)

func main() {
	dashboard.New("Scatter Plot Dashboard",
		dashboard.AddPanel("Data Correlation Analysis",
			panel.New(
				scatter.Chart(),
			),
		),
	)
}```
```
