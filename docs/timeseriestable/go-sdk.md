# TimeSeriesTable Go SDK

## Constructor

```golang
package main

import timeseriestable "github.com/perses/plugins/timeseriestable/sdk/go"

timeseriestable.Chart()
```

The TimeSeriesTable plugin has a simple constructor with no configurable options.

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
	timeseriestable "github.com/perses/plugins/timeseriestable/sdk/go"
)

func main() {
	dashboard.New("Time Series Table Dashboard",
		dashboard.AddPanel("Time Series Data",
			panel.New(
				timeseriestable.Chart(),
			),
		),
	)
}```
```
